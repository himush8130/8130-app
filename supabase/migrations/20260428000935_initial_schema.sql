-- =====================================================================
-- 8130 APP — Initial schema (M1)
-- =====================================================================
-- Implements all 9 entities described in docs/SPEC.md §3.
--
-- Project principle: NO blocking fields on user-facing data.
--   - Every form field that can come from Base44 is nullable.
--   - Service calls accept any payload; anomalies are flagged, not bounced.
-- =====================================================================

create extension if not exists "pgcrypto";   -- for gen_random_uuid()

-- =====================================================================
-- 1. PROFESSIONS — shared lookup for vehicle types AND employee skills
-- =====================================================================
create table public.professions (
  id          smallserial primary key,
  name        text not null unique,
  created_at  timestamptz not null default now()
);

comment on table public.professions is
  'Vehicle type = technician profession. Same row links a vehicle to the techs who can service it.';


-- =====================================================================
-- 2. EMPLOYEES — technicians, managers, warehouse staff
-- =====================================================================
create type public.employee_role as enum ('technician', 'manager', 'warehouse');

create table public.employees (
  employee_number  integer primary key,
  name             text not null,
  phone            text,
  profession_id    smallint references public.professions(id) on delete restrict,
  role             public.employee_role not null,
  created_at       timestamptz not null default now()
);

comment on column public.employees.profession_id is
  'Required for role=technician (drives auto-assignment). Optional for manager/warehouse.';


-- =====================================================================
-- 3. EMPLOYEE_AVAILABILITY — daily boolean, default available
-- =====================================================================
-- Only rows for UNAVAILABLE days are stored. Absence of a row = available.
create table public.employee_availability (
  employee_number  integer not null references public.employees(employee_number) on delete cascade,
  date             date not null,
  reason           text,
  primary key (employee_number, date)
);

comment on table public.employee_availability is
  'Sparse table — only contains rows for days an employee is NOT available.';


-- =====================================================================
-- 4. VEHICLES — managed by manager, ~40 rows in production
-- =====================================================================
create table public.vehicles (
  vehicle_number  text primary key,
  type_id         smallint not null references public.professions(id) on delete restrict,
  model           text,
  created_at      timestamptz not null default now()
);

comment on column public.vehicles.type_id is
  'Determines which profession of technician auto-assignment will pick.';


-- =====================================================================
-- 5. SERVICE_CALLS — the central entity, fed by Base44 webhook
-- =====================================================================
create type public.call_status as enum (
  'new',                 -- intake done but not assigned (anomaly)
  'in_treatment',        -- assigned, technician working on it
  'waiting_for_parts',   -- blocked on a required part not in stock
  'closed',              -- finished
  'cancelled'            -- voided by manager
);

-- Sequence for the YEAR-resetting display_id ("SR-26-NNNN")
create sequence public.service_call_year_seq start with 1;

create table public.service_calls (
  id                          uuid primary key default gen_random_uuid(),
  display_id                  text not null unique,                          -- "SR-26-0001"
  external_id                 text,                                          -- from Base44 form payload
  -- Form fields (all optional per project principle)
  vehicle_name                text,
  vehicle_number              text,                                          -- intentionally NOT a FK — accept unknown
  reporter_name               text,
  reporter_phone              text,
  description                 text,
  -- Assignment
  status                      public.call_status not null default 'new',
  assigned_employee_number    integer references public.employees(employee_number) on delete set null,
  -- Anomalies (jsonb array of {code, detail}); soft anomalies do not block flow
  anomaly_flags               jsonb not null default '[]'::jsonb,
  -- Lifecycle
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  closed_at                   timestamptz,
  closed_by                   integer references public.employees(employee_number) on delete set null
);

create index service_calls_status_idx          on public.service_calls (status);
create index service_calls_assigned_idx        on public.service_calls (assigned_employee_number);
create index service_calls_vehicle_idx         on public.service_calls (vehicle_number);
create index service_calls_created_at_idx      on public.service_calls (created_at desc);

comment on column public.service_calls.vehicle_number is
  'Free text — may not match any row in vehicles. Anomaly flag set if so.';


-- Trigger: auto-assign display_id of the form "SR-YY-NNNN" on insert
create or replace function public.fn_assign_service_call_display_id()
returns trigger
language plpgsql
as $$
declare
  yy text;
  nn integer;
begin
  yy := to_char(now() at time zone 'Asia/Jerusalem', 'YY');
  nn := nextval('public.service_call_year_seq');
  new.display_id := format('SR-%s-%s', yy, lpad(nn::text, 4, '0'));
  return new;
end;
$$;

create trigger trg_service_calls_display_id
  before insert on public.service_calls
  for each row
  when (new.display_id is null)
  execute function public.fn_assign_service_call_display_id();

-- Trigger: bump updated_at on every UPDATE
create or replace function public.fn_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_service_calls_updated_at
  before update on public.service_calls
  for each row
  execute function public.fn_touch_updated_at();


-- =====================================================================
-- 6. PARTS CATALOG — ~6,000 rows in production, 10 in dev
-- =====================================================================
create table public.parts (
  sku               text primary key,
  name              text not null,
  quantity          integer not null default 0 check (quantity >= 0),
  location          text,
  min_threshold     integer not null default 0 check (min_threshold >= 0),
  supplier          text,
  pending_approval  boolean not null default false,   -- technician proposed addition
  created_at        timestamptz not null default now()
);

create index parts_low_stock_idx
  on public.parts (sku) where quantity <= min_threshold;
create index parts_pending_approval_idx
  on public.parts (sku) where pending_approval = true;


-- =====================================================================
-- 7. CALL_REQUIRED_PARTS — what tech needs (does NOT affect inventory)
-- =====================================================================
create type public.required_part_status as enum (
  'in_stock',          -- ready for tech to withdraw
  'awaiting_order',    -- warehouse needs to order
  'awaiting_receipt',  -- ordered, not arrived
  'received'           -- arrived, ready to withdraw
);

create table public.call_required_parts (
  id              uuid primary key default gen_random_uuid(),
  call_id         uuid not null references public.service_calls(id) on delete cascade,
  part_sku        text not null references public.parts(sku) on delete restrict,
  quantity        integer not null check (quantity > 0),
  status          public.required_part_status not null default 'in_stock',
  requested_by    integer references public.employees(employee_number) on delete set null,
  requested_at    timestamptz not null default now(),
  unique (call_id, part_sku)
);

create index call_required_parts_call_idx     on public.call_required_parts (call_id);
create index call_required_parts_status_idx   on public.call_required_parts (status);

comment on table public.call_required_parts is
  'Declared needs. Inventory is NOT decremented when rows are inserted here.';


-- =====================================================================
-- 8. PART_WITHDRAWALS — physical movement; THIS deducts inventory
-- =====================================================================
create table public.part_withdrawals (
  id               uuid primary key default gen_random_uuid(),
  call_id          uuid not null references public.service_calls(id) on delete cascade,
  part_sku         text not null references public.parts(sku) on delete restrict,
  quantity         integer not null check (quantity > 0),
  withdrawn_by     integer not null references public.employees(employee_number) on delete restrict,
  released_by      integer not null references public.employees(employee_number) on delete restrict,
  withdrawn_at     timestamptz not null default now()
);

create index part_withdrawals_call_idx        on public.part_withdrawals (call_id);
create index part_withdrawals_part_idx        on public.part_withdrawals (part_sku);
create index part_withdrawals_withdrawn_at    on public.part_withdrawals (withdrawn_at desc);

-- Trigger: deduct from parts.quantity when a withdrawal is recorded
create or replace function public.fn_deduct_part_on_withdrawal()
returns trigger
language plpgsql
as $$
begin
  update public.parts
     set quantity = quantity - new.quantity
   where sku = new.part_sku;
  return new;
end;
$$;

create trigger trg_part_withdrawals_deduct
  after insert on public.part_withdrawals
  for each row
  execute function public.fn_deduct_part_on_withdrawal();


-- =====================================================================
-- 9. CALL_COMMENTS — chronological log per call
-- =====================================================================
create table public.call_comments (
  id                       uuid primary key default gen_random_uuid(),
  call_id                  uuid not null references public.service_calls(id) on delete cascade,
  author_employee_number   integer references public.employees(employee_number) on delete set null,
  text                     text not null,
  created_at               timestamptz not null default now()
);

create index call_comments_call_idx       on public.call_comments (call_id, created_at);
