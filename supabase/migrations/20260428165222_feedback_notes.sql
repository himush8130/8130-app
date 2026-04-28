-- =====================================================================
-- 8130 APP — Feedback notes (in-app UI feedback log)
-- =====================================================================
-- Lets any logged-in user leave notes about UI components while using
-- the app. Each note records who, when, what, on which page, and which
-- component IDs were referenced (extracted via #NNNN regex on the
-- frontend before insert).
--
-- Edits/deletes are restricted (in the Edge Function) to the note's
-- original author. RLS here permits SELECT + INSERT for any reader/
-- writer; UPDATE/DELETE go via service_role only (Edge Function).
-- =====================================================================

create sequence public.feedback_note_seq start with 1;

create table public.feedback_notes (
  id                       uuid primary key default gen_random_uuid(),
  display_id               text not null unique,                          -- "NOTE-0001"
  author_employee_number   integer not null references public.employees(employee_number) on delete restrict,
  author_name              text not null,                                 -- denormalized for fast display
  page_path                text not null default '/',
  component_ids            smallint[] not null default '{}',
  text                     text not null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index feedback_notes_created_at_idx on public.feedback_notes (created_at desc);
create index feedback_notes_author_idx     on public.feedback_notes (author_employee_number);
create index feedback_notes_page_idx       on public.feedback_notes (page_path);

-- Trigger: assign NOTE-NNNN display_id on insert
create or replace function public.fn_assign_feedback_display_id()
returns trigger
language plpgsql
as $$
declare
  nn integer;
begin
  nn := nextval('public.feedback_note_seq');
  new.display_id := 'NOTE-' || lpad(nn::text, 4, '0');
  return new;
end;
$$;

create trigger trg_feedback_notes_display_id
  before insert on public.feedback_notes
  for each row
  when (new.display_id is null)
  execute function public.fn_assign_feedback_display_id();

-- Trigger: bump updated_at on every UPDATE
create trigger trg_feedback_notes_updated_at
  before update on public.feedback_notes
  for each row
  execute function public.fn_touch_updated_at();

-- RLS
alter table public.feedback_notes enable row level security;

create policy "anon read"   on public.feedback_notes for select to anon, authenticated using (true);
-- INSERT/UPDATE/DELETE flow exclusively through service_role via the
-- Edge Function (which checks author identity). Don't grant to anon.
