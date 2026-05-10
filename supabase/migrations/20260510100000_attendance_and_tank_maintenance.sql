-- =====================================================================
-- 8130 APP — Attendance report flag + tank monthly maintenance
-- =====================================================================
-- 1. employees.exclude_from_availability_report — managers tick this on
--    employees who shouldn't appear in the daily attendance copy
--    (e.g. office staff that don't run shift coverage).
-- 2. tank_monthly_maintenance — per-tank list of weeks (Sunday-anchored)
--    on which the monthly maintenance is scheduled. Any week NOT in the
--    list is a regular weekly maintenance week.
-- =====================================================================

alter table public.employees
  add column exclude_from_availability_report boolean not null default false;

create table public.tank_monthly_maintenance (
  vehicle_number text not null references public.vehicles(vehicle_number) on delete cascade,
  week_start     date not null,
  created_at     timestamptz not null default now(),
  primary key (vehicle_number, week_start)
);

create index tank_monthly_maintenance_week_idx
  on public.tank_monthly_maintenance (week_start);

alter table public.tank_monthly_maintenance enable row level security;
create policy "anon read"
  on public.tank_monthly_maintenance for select to anon, authenticated using (true);
-- Writes go through the manager-gated Edge Function with the service role.
