-- ============================================================================
-- SRK Flowers — Migration 01
-- Changes:
--   * No stock tracking (flowers are sold same day) — billing no longer
--     deducts stock.
--   * Each bill can record the money received now; the leftover becomes the
--     merchant's running balance and carries into the next bill.
-- Paste this whole file into Supabase -> SQL Editor -> Run. Safe to re-run.
-- ============================================================================

-- Old 4-argument version is replaced by a 5-argument version (adds p_received).
drop function if exists public.create_bill(uuid, date, numeric, jsonb);

create or replace function public.create_bill(
  p_merchant_id uuid,
  p_bill_date   date,
  p_luggage     numeric,
  p_received    numeric,   -- money the merchant gave for this bill (can be 0)
  p_items       jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_balance   numeric(12,2);
  v_items_total   numeric(12,2) := 0;
  v_grand_total   numeric(12,2);
  v_received      numeric(12,2);
  v_balance_after numeric(12,2);
  v_status        text;
  v_bill_id       uuid;
  v_item          jsonb;
  v_amount        numeric(12,2);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select balance into v_old_balance from public.merchants
    where id = p_merchant_id for update;
  if v_old_balance is null then
    raise exception 'Merchant not found';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_items_total := v_items_total
      + round((coalesce((v_item->>'kilo')::numeric,0) * coalesce((v_item->>'rate')::numeric,0)), 2);
  end loop;

  v_grand_total   := v_items_total + coalesce(p_luggage,0) + v_old_balance;
  v_received      := coalesce(p_received, 0);
  v_balance_after := v_grand_total - v_received;

  if v_balance_after <= 0.005 then
    v_status := 'paid';
  elsif v_received > 0 then
    v_status := 'partial';
  else
    v_status := 'unpaid';
  end if;

  insert into public.bills (merchant_id, bill_date, luggage, old_balance,
                            items_total, grand_total, paid_amount, status, created_by)
  values (p_merchant_id, coalesce(p_bill_date, current_date), coalesce(p_luggage,0),
          v_old_balance, v_items_total, v_grand_total, v_received, v_status, auth.uid())
  returning id into v_bill_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_amount := round((coalesce((v_item->>'kilo')::numeric,0) * coalesce((v_item->>'rate')::numeric,0)), 2);
    insert into public.bill_items (bill_id, flower_id, flower_name_en, flower_name_ta, kilo, rate, amount)
    values (
      v_bill_id,
      nullif(v_item->>'flower_id','')::uuid,
      coalesce(v_item->>'flower_name_en',''),
      coalesce(v_item->>'flower_name_ta',''),
      coalesce((v_item->>'kilo')::numeric,0),
      coalesce((v_item->>'rate')::numeric,0),
      v_amount
    );
    -- NOTE: stock is intentionally NOT deducted anymore.
  end loop;

  -- record the money received as a payment row (for history/reports)
  if v_received > 0 then
    insert into public.payments (merchant_id, amount, paid_on, method, note, created_by)
    values (p_merchant_id, v_received, coalesce(p_bill_date, current_date), 'cash', 'With bill', auth.uid());
  end if;

  -- leftover becomes the new outstanding balance (carries to next bill)
  update public.merchants set balance = v_balance_after where id = p_merchant_id;

  return v_bill_id;
end;
$$;
