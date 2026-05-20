-- =====================================================================
-- 8130 APP — record the replacement SKU for blocked SKUs
-- =====================================================================
-- When a SKU is taken out of service (is_sku_blocked = true) the
-- warehouse marks the new SKU that supersedes it here. Any surface
-- where a user types a SKU can then look up the blocked → new
-- mapping and surface a "this SKU is blocked, new SKU: X" hint.
-- =====================================================================

alter table public.parts
  add column replacement_sku text;
