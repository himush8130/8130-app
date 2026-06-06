create table public.inventory_count_sessions (
  id         uuid primary key default gen_random_uuid(),
  opened_by  integer not null references public.employees(employee_number) on delete set null,
  opened_at  timestamptz not null default now(),
  closed_at  timestamptz,
  status     text not null default 'open' check (status in ('open', 'closed'))
);

create table public.inventory_count_entries (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.inventory_count_sessions(id) on delete cascade,
  part_id      uuid not null references public.parts(id) on delete cascade,
  counted_qty  integer not null check (counted_qty >= 0),
  expected_qty integer not null,
  counted_by   integer not null references public.employees(employee_number) on delete set null,
  counted_at   timestamptz not null default now(),
  unique (session_id, part_id)
);

create index inventory_count_entries_session_idx on public.inventory_count_entries(session_id);
