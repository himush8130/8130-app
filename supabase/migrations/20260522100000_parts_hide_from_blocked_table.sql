-- =====================================================================
-- 8130 APP — hide_from_blocked_table on parts
-- =====================================================================
-- Boolean knob the warehouse user toggles via "הסתר מטבלה זו" on a
-- resolved (has replacement_sku) blocked-SKU row. Shared across all
-- users — once one warehouse user hides the row, it disappears from
-- everyone's blocked-SKUs table.
-- =====================================================================

alter table public.parts
  add column hide_from_blocked_table boolean not null default false;
