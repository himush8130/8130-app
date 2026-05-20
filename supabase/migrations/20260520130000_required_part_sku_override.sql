-- =====================================================================
-- 8130 APP — per-row SKU override
-- =====================================================================
-- When set, the row's displayed SKU is this value instead of the
-- catalog row's SKU. Lets the warehouse rename the SKU for one
-- required-part without rewriting the underlying parts row (and
-- therefore without affecting other calls that share that part).
-- =====================================================================

alter table public.call_required_parts
  add column sku_override text;
