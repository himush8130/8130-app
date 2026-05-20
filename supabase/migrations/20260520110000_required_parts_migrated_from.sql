-- =====================================================================
-- 8130 APP — track blocked → replacement part migrations
-- =====================================================================
-- When a manager records replacement_sku on a blocked part, every
-- open call_required_parts row pointing to the blocked part is moved
-- onto the replacement part. We keep a stable FK back to the original
-- so the detail page can render "related blocked sku: X" — i.e. so
-- the row's history isn't lost.
-- =====================================================================

alter table public.call_required_parts
  add column migrated_from_part_id uuid
    references public.parts(id) on delete set null;

create index call_required_parts_migrated_from_idx
  on public.call_required_parts (migrated_from_part_id)
  where migrated_from_part_id is not null;
