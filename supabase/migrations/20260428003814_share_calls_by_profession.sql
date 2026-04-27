-- =====================================================================
-- 8130 APP — Switch service_calls from single-assignee to shared-by-profession
-- =====================================================================
-- Originally we modeled each call as having a single assigned technician
-- (`assigned_employee_number`). Per refined product decision, calls are
-- visible to ALL technicians of the relevant profession — there is no
-- "owner" of a call. Anyone can comment, request parts, or close.
--
-- Schema changes:
--   * DROP service_calls.assigned_employee_number (and its index).
--   * ADD  service_calls.profession_id (FK → professions, nullable).
--          Nullable because hard anomalies (unknown vehicle) leave it null.
--   * ADD  index on profession_id for the "calls visible to my team" query.
--
-- closed_by is preserved — we still record who closed a call, even though
-- there's no exclusive owner during its lifetime.
-- =====================================================================

-- 1. Add the new column (nullable, FK; on profession delete keep history → set null)
alter table public.service_calls
  add column profession_id smallint
    references public.professions(id) on delete set null;

create index service_calls_profession_idx
  on public.service_calls (profession_id);

comment on column public.service_calls.profession_id is
  'Determines which technicians can see this call. Null on hard anomalies (unknown vehicle).';


-- 2. Drop the old single-assignee column (its index drops with it)
alter table public.service_calls
  drop column assigned_employee_number;
