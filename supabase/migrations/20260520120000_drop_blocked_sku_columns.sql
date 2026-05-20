-- =====================================================================
-- 8130 APP — Roll back the blocked-SKU replacement schema
-- =====================================================================
-- Reverts the two columns added on 2026-05-20:
--   parts.replacement_sku
--   call_required_parts.migrated_from_part_id
-- The previous migration files stay in history so timeline reads
-- cleanly; this migration just drops the columns + their indexes.
-- =====================================================================

drop index if exists public.call_required_parts_migrated_from_idx;
alter table public.call_required_parts
  drop column if exists migrated_from_part_id;

alter table public.parts
  drop column if exists replacement_sku;
