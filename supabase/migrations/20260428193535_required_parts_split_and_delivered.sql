-- =====================================================================
-- 8130 APP — Required-parts: allow duplicates per call, add 'delivered'
-- =====================================================================
-- Per feedback NOTE-0004/0007:
--   * A single call may now have multiple rows for the same SKU. Used
--     when (a) the tech adds more after an initial request, or (b) the
--     system splits a request into "in_stock" + "awaiting_order" parts.
--   * New status 'delivered' marks a required-part row as fulfilled —
--     i.e. a part_withdrawals row covered it. Excluded from pending
--     queues and from the "reserved" calculation.
-- =====================================================================

alter table public.call_required_parts
  drop constraint call_required_parts_call_id_part_sku_key;

alter type public.required_part_status add value if not exists 'delivered';
