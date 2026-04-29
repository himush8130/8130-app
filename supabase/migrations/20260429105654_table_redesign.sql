-- =====================================================================
-- 8130 APP — Table redesign (per docs/TABLES.md)
-- =====================================================================
-- Schema rework collected during the requirements session:
--
--   1. employees.role            -> employees.permissions (default 'technician')
--   2. employees.profession_id   -> employees.profession_name (text, no FK)
--   3. vehicles.type_id          -> vehicles.type_name        (text, no FK)
--   4. vehicles.model            -> vehicles.department
--   5. service_calls.profession_id -> service_calls.profession_name (text)
--   6. service_calls.display_id  -> new format <vehicle>-<DDMM>-<NNNN>
--      with a global running sequence (no yearly reset).
--
-- Existing data is preserved: profession names backfilled from the
-- current professions table before the FK columns are dropped.
--
-- The professions table itself is kept (small canonical lookup) and
-- will be repopulated from the worker's employees.xlsx + vehicles.xlsx
-- at import time.
--
-- Existing service-calls keep their `SR-26-NNNN` display_ids; only
-- newly-inserted rows use the new format.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. employees.role -> employees.permissions
-- ---------------------------------------------------------------------
alter type public.employee_role rename to employee_permissions;
alter table public.employees rename column role to permissions;
alter table public.employees alter column permissions set default 'technician';


-- ---------------------------------------------------------------------
-- 2. employees.profession_id -> employees.profession_name
-- ---------------------------------------------------------------------
alter table public.employees add column profession_name text;

update public.employees e
   set profession_name = p.name
  from public.professions p
 where p.id = e.profession_id;

alter table public.employees drop column profession_id;


-- ---------------------------------------------------------------------
-- 3. vehicles.type_id -> vehicles.type_name
-- ---------------------------------------------------------------------
alter table public.vehicles add column type_name text;

update public.vehicles v
   set type_name = p.name
  from public.professions p
 where p.id = v.type_id;

alter table public.vehicles alter column type_name set not null;
alter table public.vehicles drop column type_id;


-- ---------------------------------------------------------------------
-- 4. vehicles.model -> vehicles.department
-- ---------------------------------------------------------------------
alter table public.vehicles rename column model to department;


-- ---------------------------------------------------------------------
-- 5. service_calls.profession_id -> service_calls.profession_name
-- ---------------------------------------------------------------------
-- Drop the old index that was on profession_id; the new column gets
-- its own index below.
drop index if exists public.service_calls_profession_idx;

alter table public.service_calls add column profession_name text;

update public.service_calls sc
   set profession_name = p.name
  from public.professions p
 where p.id = sc.profession_id;

alter table public.service_calls drop column profession_id;

create index service_calls_profession_idx
  on public.service_calls (profession_name);


-- ---------------------------------------------------------------------
-- 6. New display_id format: <vehicle>-<DDMM>-<NNNN>
-- ---------------------------------------------------------------------
-- Drop the old trigger + function + year sequence.
drop trigger  if exists trg_service_calls_display_id on public.service_calls;
drop function if exists public.fn_assign_service_call_display_id();
drop sequence if exists public.service_call_year_seq;

-- New sequence: global running counter.
create sequence public.service_call_running_seq start with 1;

create function public.fn_assign_service_call_display_id()
returns trigger
language plpgsql
as $$
declare
  ddmm text;
  nn   integer;
  veh  text;
begin
  ddmm := to_char(now() at time zone 'Asia/Jerusalem', 'DDMM');
  nn   := nextval('public.service_call_running_seq');
  -- Strip non-alphanumeric chars from vehicle_number; fall back to UNKNOWN.
  veh  := coalesce(nullif(regexp_replace(coalesce(new.vehicle_number, ''), '[^a-zA-Z0-9]', '', 'g'), ''), 'UNKNOWN');
  new.display_id := format('%s-%s-%s', veh, ddmm, lpad(nn::text, 4, '0'));
  return new;
end;
$$;

create trigger trg_service_calls_display_id
  before insert on public.service_calls
  for each row
  when (new.display_id is null)
  execute function public.fn_assign_service_call_display_id();
