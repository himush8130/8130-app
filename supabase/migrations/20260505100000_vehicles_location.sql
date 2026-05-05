-- =====================================================================
-- 8130 APP — Add `location` to vehicles
-- =====================================================================
-- Per NOTE-0029: each vehicle has a free-text physical location (e.g.
-- "חוף") that should be visible on its vehicle card.
-- =====================================================================

alter table public.vehicles
  add column location text;
