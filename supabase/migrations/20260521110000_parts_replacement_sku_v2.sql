-- =====================================================================
-- 8130 APP — replacement_sku on parts (minimal version)
-- =====================================================================
-- Optional text field on a catalog part. When set, any UI surface
-- where a technician picks the part shows a soft message:
-- "לפריט זה קיים מק״ט חדש: X". No automatic migration of existing
-- required-parts; no FK; pure display hint.
-- =====================================================================

alter table public.parts
  add column replacement_sku text;
