-- =====================================================================
-- 8130 APP — Important vehicle note + tank engine hours/kilometers
-- =====================================================================
-- 1. vehicles.important_note + vehicles.important_note_color: a short
--    free-text alert the manager pins to a vehicle. Surfaces as a
--    colored chip wherever the vehicle is shown.
-- 2. vehicles.initial_engine_hours: manager-set baseline used to
--    derive the "סף" (initial + 200) for the maintenance reminder.
--    vehicles.current_engine_hours / current_kilometers: the latest
--    reading the technician filed via the vehicle book.
-- =====================================================================

alter table public.vehicles
  add column important_note        text,
  add column important_note_color  text,
  add column initial_engine_hours  integer,
  add column current_engine_hours  integer,
  add column current_kilometers    integer;

-- Limit the palette to the design system's tone names so the badge
-- styling stays consistent.
alter table public.vehicles
  add constraint vehicles_important_note_color_chk
  check (important_note_color is null
         or important_note_color in ('yellow', 'red', 'green', 'blue', 'gray'));
