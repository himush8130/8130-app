-- =====================================================================
-- 8130 APP — Add status to feedback_notes
-- =====================================================================
-- Each note now has a lifecycle status: 'new' (open) or 'done'
-- (resolved/implemented). Lets users mark which feedback has been
-- addressed, and bulk-delete the resolved ones.
-- =====================================================================

alter table public.feedback_notes
  add column status text not null default 'new'
    check (status in ('new', 'done'));

create index feedback_notes_status_idx on public.feedback_notes (status);
