-- =====================================================================
-- 8130 APP — Tank specialty on employees & service_calls
-- =====================================================================
-- Per user direction (NOTE-0017, NOTE-0015): for the tank fleet only,
-- track an optional "specialty" — מכונאות / חשמל / צריח / בק״ש.
--
-- - employees.specialty: which specialty the technician handles
-- - service_calls.specialty: which specialty the call requires
--
-- Both are free text (nullable). The UI restricts options to the four
-- known values and only surfaces them for tank-related rows.
-- =====================================================================

alter table public.employees
  add column specialty text;

alter table public.service_calls
  add column specialty text;
