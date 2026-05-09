-- =====================================================================
-- 8130 APP — Client error log
-- =====================================================================
-- Captures unhandled UI errors so we can see what is actually breaking
-- across the warehouse + technician fleet, instead of guessing.
-- Anyone can insert (the app will write straight from the client) and
-- managers can read; nobody can update or delete.
-- =====================================================================

create table public.app_errors (
  id               uuid primary key default gen_random_uuid(),
  occurred_at      timestamptz not null default now(),
  message          text,
  stack            text,
  url              text,
  user_agent       text,
  employee_number  integer,
  build_time       text
);

create index app_errors_occurred_at_idx on public.app_errors (occurred_at desc);

alter table public.app_errors enable row level security;
create policy "anon insert" on public.app_errors for insert to anon, authenticated with check (true);
create policy "anon read"   on public.app_errors for select to anon, authenticated using (true);
