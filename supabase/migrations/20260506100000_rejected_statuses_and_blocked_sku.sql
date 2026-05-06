-- =====================================================================
-- 8130 APP — Rejected required-part statuses + blocked-SKU flag
-- =====================================================================
-- NOTE-0036: extra states for the order pipeline plus a way to mark a
-- catalog SKU as obsolete and replace it with a fresh one.
--
-- 1. Required-part status enum gets:
--      - 'rejected'                  the order was not approved
--      - 'pending_special_approval'  reroute through special channel
--      - 'rejected_final'            no further action will be taken
--    Anywhere in the warehouse pipeline a row can transition into
--    'rejected'. From 'rejected' it can move to either of the next
--    two terminal-ish states.
--
-- 2. parts.is_sku_blocked: when true, the part's existing sku is
--    obsolete and the warehouse must assign a new one. The UI guides
--    the warehouse to update the sku; the FK on call_required_parts
--    points at parts.id, so the new sku flows automatically into
--    every call referencing that catalog row.
-- =====================================================================

alter type public.required_part_status add value if not exists 'rejected';
alter type public.required_part_status add value if not exists 'pending_special_approval';
alter type public.required_part_status add value if not exists 'rejected_final';

alter table public.parts
  add column is_sku_blocked boolean not null default false;

create index parts_sku_blocked_idx
  on public.parts (id) where is_sku_blocked = true;
