-- ============================================================================
-- SRK Flowers — RESET TEST DATA
-- Use this ONLY while testing, to wipe all bills/payments and start clean.
-- It deletes every bill, bill item, and payment, and sets all merchant
-- balances to 0. Your places, merchants, flowers and shop settings stay.
--
-- ⚠️ Do NOT run this once you have started entering real shop data.
-- Paste into Supabase -> SQL Editor -> Run.
-- ============================================================================

delete from public.payments;
delete from public.bill_items;
delete from public.bills;
update public.merchants set balance = 0;
