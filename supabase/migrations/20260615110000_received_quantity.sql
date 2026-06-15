-- Allow recording a different quantity than ordered when receiving parts.
alter table public.call_required_parts
  add column if not exists received_quantity integer;
