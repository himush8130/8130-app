-- =====================================================================
-- 8130 APP — Enable realtime on parts (and call_required_parts /
-- part_withdrawals while we're at it, so warehouse dashboards stay
-- in sync between phone and desktop).
-- =====================================================================

alter publication supabase_realtime add table public.parts;
alter publication supabase_realtime add table public.call_required_parts;
alter publication supabase_realtime add table public.part_withdrawals;
