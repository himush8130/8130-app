alter table public.employees
  add column if not exists pin_hash text;
