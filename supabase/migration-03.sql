-- ============================================================================
-- SRK Flowers — Migration 03  (clean accounting model)
-- Bills and Payments are independent. A bill is ONLY a charge.
-- Outstanding = SUM(bill_amount) - SUM(payments).  No "paid" field on a bill.
-- Paste into Supabase -> SQL Editor -> Run. Safe to run once and to re-run.
-- ============================================================================

-- ---- bill numbering (starts at 1001) ----
create sequence if not exists public.bills_no_seq start with 1001;

alter table public.bills add column if not exists bill_no          integer;
alter table public.bills add column if not exists bill_amount      numeric(12,2) not null default 0;  -- items + commission + luggage
alter table public.bills add column if not exists previous_balance numeric(12,2) not null default 0;  -- outstanding before this bill
alter table public.bills add column if not exists total_payable    numeric(12,2) not null default 0;  -- previous_balance + bill_amount
alter table public.bills alter column bill_no set default nextval('public.bills_no_seq');

-- ---- outstanding = total bills charged - total payments received ----
create or replace function public.recompute_balance(p_merchant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.merchants set balance = round(
      coalesce((select sum(bill_amount) from public.bills    where merchant_id = p_merchant_id), 0)
    - coalesce((select sum(amount)      from public.payments where merchant_id = p_merchant_id), 0)
  , 2)
  where id = p_merchant_id;
end;
$$;

-- ---- STEP 1: generate a bill (no payment here) ----
drop function if exists public.create_bill(uuid, date, numeric, numeric, jsonb);
drop function if exists public.create_bill(uuid, date, numeric, numeric, numeric, jsonb);

create function public.create_bill(
  p_merchant_id        uuid,
  p_bill_date          date,
  p_luggage            numeric,
  p_commission_percent numeric,
  p_items              jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev        numeric(12,2);
  v_items_total numeric(12,2) := 0;
  v_commission  numeric(12,2);
  v_bill_amount numeric(12,2);
  v_payable     numeric(12,2);
  v_bill_id     uuid;
  v_item        jsonb;
  v_amount      numeric(12,2);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select balance into v_prev from public.merchants where id = p_merchant_id for update;
  if v_prev is null then
    raise exception 'Merchant not found';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_items_total := v_items_total
      + round((coalesce((v_item->>'kilo')::numeric,0) * coalesce((v_item->>'rate')::numeric,0)), 2);
  end loop;

  v_commission  := round(v_items_total * coalesce(p_commission_percent,0) / 100.0, 2);
  v_bill_amount := round(v_items_total + v_commission + coalesce(p_luggage,0), 2);
  v_payable     := round(v_prev + v_bill_amount, 2);

  insert into public.bills (merchant_id, bill_date, luggage, items_total,
                            commission_percent, commission_amount, bill_amount,
                            previous_balance, total_payable,
                            old_balance, grand_total, paid_amount, status, created_by)
  values (p_merchant_id, coalesce(p_bill_date, current_date), coalesce(p_luggage,0), v_items_total,
          coalesce(p_commission_percent,0), v_commission, v_bill_amount,
          v_prev, v_payable,
          v_prev, v_payable, 0, 'unpaid', auth.uid())
  returning id into v_bill_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_amount := round((coalesce((v_item->>'kilo')::numeric,0) * coalesce((v_item->>'rate')::numeric,0)), 2);
    insert into public.bill_items (bill_id, flower_id, flower_name_en, flower_name_ta, kilo, rate, amount)
    values (v_bill_id, nullif(v_item->>'flower_id','')::uuid,
            coalesce(v_item->>'flower_name_en',''), coalesce(v_item->>'flower_name_ta',''),
            coalesce((v_item->>'kilo')::numeric,0), coalesce((v_item->>'rate')::numeric,0), v_amount);
  end loop;

  perform public.recompute_balance(p_merchant_id);
  return v_bill_id;
end;
$$;

-- ---- STEP 2: receive a payment (independent of bills) ----
drop function if exists public.record_payment(uuid, numeric, date, text, text);
drop function if exists public.record_payment(uuid, numeric, date, text, text, uuid);

create function public.record_payment(
  p_merchant_id uuid,
  p_amount      numeric,
  p_paid_on     date,
  p_method      text,
  p_note        text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.payments (merchant_id, amount, paid_on, method, note, created_by)
  values (p_merchant_id, round(coalesce(p_amount,0),2), coalesce(p_paid_on, current_date),
          coalesce(p_method,'cash'), coalesce(p_note,''), auth.uid())
  returning id into v_id;

  perform public.recompute_balance(p_merchant_id);
  return v_id;
end;
$$;

-- ---- corrections: delete a bill or a payment, then recompute ----
create or replace function public.delete_bill(p_bill_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_m uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select merchant_id into v_m from public.bills where id = p_bill_id;
  if v_m is null then return; end if;
  delete from public.bills where id = p_bill_id;          -- cascades bill_items
  perform public.recompute_balance(v_m);
end;
$$;

create or replace function public.delete_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_m uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select merchant_id into v_m from public.payments where id = p_payment_id;
  if v_m is null then return; end if;
  delete from public.payments where id = p_payment_id;
  perform public.recompute_balance(v_m);
end;
$$;

-- ---- MERCHANT LEDGER (bills + payments as one timeline) ----
create or replace view public.v_ledger as
  select merchant_id, bill_date as entry_date, created_at,
         'bill' as entry_type, ('#' || bill_no::text) as ref,
         bill_amount as amount
  from public.bills
  union all
  select merchant_id, paid_on as entry_date, created_at,
         'payment' as entry_type, method as ref,
         amount
  from public.payments;

-- ---- backfill existing rows (harmless if you reset data) ----
update public.bills
   set bill_amount = round(items_total + commission_amount + luggage, 2),
       previous_balance = old_balance,
       total_payable = grand_total
 where bill_amount = 0;
update public.bills set bill_no = nextval('public.bills_no_seq') where bill_no is null;

-- ---- fix every merchant's balance with the clean rule ----
do $$
declare m record;
begin
  for m in select id from public.merchants loop
    perform public.recompute_balance(m.id);
  end loop;
end $$;
