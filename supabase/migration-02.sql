-- ============================================================================
-- SRK Flowers — Migration 02 (commission + delete bill + exact balances)
-- Safe to run once, and safe to re-run. Paste into Supabase -> SQL Editor -> Run.
--
-- Money rule (single source of truth):
--   merchant.balance = SUM(all bills: items + commission + luggage)
--                    - SUM(all payments received)
--   * commission is charged ONLY on that bill's flowers, never on old balance.
--   * deleting a bill removes its charges AND its linked payments, then the
--     balance is recomputed exactly.
-- ============================================================================

-- ---- new columns (safe if they already exist) ----
alter table public.merchants add column if not exists default_commission numeric(6,2) not null default 0;
alter table public.bills add column if not exists commission_percent numeric(6,2) not null default 0;
alter table public.bills add column if not exists commission_amount numeric(12,2) not null default 0;
-- link a payment to the bill it belongs to (so deleting a bill removes them too)
alter table public.payments add column if not exists bill_id uuid references public.bills(id) on delete cascade;

-- ---- the one true balance calculation ----
create or replace function public.recompute_balance(p_merchant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.merchants set balance = round(
      coalesce((select sum(items_total + commission_amount + luggage)
                from public.bills where merchant_id = p_merchant_id), 0)
    - coalesce((select sum(amount)
                from public.payments where merchant_id = p_merchant_id), 0)
  , 2)
  where id = p_merchant_id;
end;
$$;

-- ---- create a bill (commission-aware, exact, links the received payment) ----
drop function if exists public.create_bill(uuid, date, numeric, numeric, jsonb);
drop function if exists public.create_bill(uuid, date, numeric, numeric, numeric, jsonb);

create function public.create_bill(
  p_merchant_id        uuid,
  p_bill_date          date,
  p_luggage            numeric,
  p_received           numeric,
  p_commission_percent numeric,
  p_items              jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_balance numeric(12,2);
  v_items_total numeric(12,2) := 0;
  v_commission  numeric(12,2);
  v_grand_total numeric(12,2);
  v_received    numeric(12,2);
  v_bill_id     uuid;
  v_item        jsonb;
  v_amount      numeric(12,2);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select balance into v_old_balance from public.merchants where id = p_merchant_id for update;
  if v_old_balance is null then
    raise exception 'Merchant not found';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_items_total := v_items_total
      + round((coalesce((v_item->>'kilo')::numeric,0) * coalesce((v_item->>'rate')::numeric,0)), 2);
  end loop;

  v_commission  := round(v_items_total * coalesce(p_commission_percent,0) / 100.0, 2);
  v_received    := round(coalesce(p_received, 0), 2);
  v_grand_total := round(v_items_total + v_commission + coalesce(p_luggage,0) + v_old_balance, 2);

  insert into public.bills (merchant_id, bill_date, luggage, old_balance,
                            items_total, commission_percent, commission_amount,
                            grand_total, paid_amount, status, created_by)
  values (p_merchant_id, coalesce(p_bill_date, current_date), coalesce(p_luggage,0),
          v_old_balance, v_items_total, coalesce(p_commission_percent,0), v_commission,
          v_grand_total, v_received,
          case when v_grand_total - v_received <= 0.005 then 'paid'
               when v_received > 0 then 'partial' else 'unpaid' end,
          auth.uid())
  returning id into v_bill_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_amount := round((coalesce((v_item->>'kilo')::numeric,0) * coalesce((v_item->>'rate')::numeric,0)), 2);
    insert into public.bill_items (bill_id, flower_id, flower_name_en, flower_name_ta, kilo, rate, amount)
    values (v_bill_id, nullif(v_item->>'flower_id','')::uuid,
            coalesce(v_item->>'flower_name_en',''), coalesce(v_item->>'flower_name_ta',''),
            coalesce((v_item->>'kilo')::numeric,0), coalesce((v_item->>'rate')::numeric,0), v_amount);
  end loop;

  if v_received > 0 then
    insert into public.payments (merchant_id, bill_id, amount, paid_on, method, note, created_by)
    values (p_merchant_id, v_bill_id, v_received, coalesce(p_bill_date, current_date), 'cash', 'With bill', auth.uid());
  end if;

  perform public.recompute_balance(p_merchant_id);
  return v_bill_id;
end;
$$;

-- ---- record a payment (optionally linked to a bill), then recompute ----
drop function if exists public.record_payment(uuid, numeric, date, text, text);
drop function if exists public.record_payment(uuid, numeric, date, text, text, uuid);

create function public.record_payment(
  p_merchant_id uuid,
  p_amount      numeric,
  p_paid_on     date,
  p_method      text,
  p_note        text,
  p_bill_id     uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.payments (merchant_id, bill_id, amount, paid_on, method, note, created_by)
  values (p_merchant_id, p_bill_id, round(coalesce(p_amount,0),2),
          coalesce(p_paid_on, current_date), coalesce(p_method,'cash'), coalesce(p_note,''), auth.uid());

  if p_bill_id is not null then
    update public.bills
      set paid_amount = round(paid_amount + round(coalesce(p_amount,0),2), 2),
          status = case when paid_amount + round(coalesce(p_amount,0),2) >= grand_total - 0.005
                        then 'paid' else 'partial' end
      where id = p_bill_id;
  end if;

  perform public.recompute_balance(p_merchant_id);
end;
$$;

-- ---- delete an entire bill and fix the balance ----
create or replace function public.delete_bill(p_bill_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_merchant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select merchant_id into v_merchant_id from public.bills where id = p_bill_id;
  if v_merchant_id is null then
    return;
  end if;

  -- deleting the bill cascades to its bill_items and its linked payments
  delete from public.bills where id = p_bill_id;

  perform public.recompute_balance(v_merchant_id);
end;
$$;

-- ---- one-time: fix every existing merchant's balance with the new exact rule ----
do $$
declare
  m record;
begin
  for m in select id from public.merchants loop
    perform public.recompute_balance(m.id);
  end loop;
end $$;
