alter table public.inventory_count_sessions enable row level security;
alter table public.inventory_count_entries  enable row level security;

create policy "anon read" on public.inventory_count_sessions for select to anon, authenticated using (true);
create policy "anon read" on public.inventory_count_entries  for select to anon, authenticated using (true);
