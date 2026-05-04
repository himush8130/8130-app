-- =====================================================================
-- 8130 APP — Add is_disabling flag to service_calls
-- =====================================================================
-- Per user direction: a technician (or any role) can mark a call as
-- "משביתה" — i.e. the underlying vehicle is non-operational. Manager
-- dashboards aggregate this to show fleet readiness, especially per
-- tank company (vehicles.sub_department).
-- =====================================================================

alter table public.service_calls
  add column is_disabling boolean not null default false;

create index service_calls_is_disabling_idx
  on public.service_calls (is_disabling)
  where is_disabling = true;
