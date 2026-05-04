-- =====================================================================
-- 8130 APP — service_calls.specialty (text) → specialties (text[])
-- =====================================================================
-- Per user direction (NOTE-0024): a single fault can require more than
-- one tank specialty. Backfills existing single values into a 1-element
-- array and drops the old column.
-- =====================================================================

alter table public.service_calls
  add column specialties text[] not null default '{}';

update public.service_calls
   set specialties = array[specialty]
 where specialty is not null;

alter table public.service_calls
  drop column specialty;
