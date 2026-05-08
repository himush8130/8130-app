-- =====================================================================
-- 8130 APP — Link part_withdrawals back to its call_required_part
-- =====================================================================
-- Needed for the "revert from delivered" flow (NOTE-0049): when a
-- warehouse worker reverses a delivery, we must locate the matching
-- withdrawal row to refund stock and remove it.
-- =====================================================================

alter table public.part_withdrawals
  add column required_part_id uuid
    references public.call_required_parts(id) on delete set null;

create index part_withdrawals_required_part_idx
  on public.part_withdrawals (required_part_id);
