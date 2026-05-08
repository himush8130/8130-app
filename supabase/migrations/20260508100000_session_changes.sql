-- =====================================================================
-- 8130 APP — Session changes (NOTE-0046, 0049, copy-format, multi-loc)
-- =====================================================================
--
-- 1. NOTE-0046: optional human reason on rejected required-parts.
-- 2. Copy-format static labels: app_settings (key/value).
-- 3. Vehicle model: granular type label (e.g. "טנק מרכבה סימן 3 בז").
-- 4. Multi-location dispense: part_withdrawals.is_external — when
--    true, the existing inventory-deduction trigger skips this row.
-- =====================================================================

-- 1. Rejection reason
alter table public.call_required_parts
  add column rejection_reason text;

-- 2. Key/value app settings
create table public.app_settings (
  key   text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Seed the copy-format defaults (manager can edit later).
insert into public.app_settings (key, value) values
  ('copy_brigade_label',  'חטיבה'),
  ('copy_brigade_value',  'צפונית'),
  ('copy_battalion_label','גדוד'),
  ('copy_battalion_value','8130'),
  ('copy_kli_type_label', 'סוג הכלי'),
  ('copy_kli_fit_label',  'האם הכלי כשיר'),
  ('copy_kli_num_label',  'צ׳'),
  ('copy_location_label', 'מיקום'),
  ('copy_sku_label',      'מק״ט'),
  ('copy_part_name_label','שם החלק'),
  ('copy_qty_label',      'כמות');

alter table public.app_settings enable row level security;
create policy "anon read"     on public.app_settings for select to anon, authenticated using (true);
-- Writes still go through the Edge Function with the service role.

-- 3. vehicle.model + backfill
alter table public.vehicles
  add column model text;

update public.vehicles set model = 'טנק מרכבה סימן 3 בז' where type_name = 'טנק';
update public.vehicles set model = sub_department
  where type_name = 'רכב' and sub_department is not null and model is null;

-- 4. external withdrawal flag + deduction trigger update
alter table public.part_withdrawals
  add column is_external boolean not null default false;

-- (required_part_id is added by a follow-up migration in this same
-- session — kept separate to allow incremental application.)

-- Replace the deduction trigger: skip when is_external is true.
create or replace function public.fn_deduct_part_on_withdrawal()
returns trigger
language plpgsql
as $$
begin
  if new.is_external then
    return new;
  end if;
  update public.parts
     set quantity = greatest(0, quantity - new.quantity)
   where id = new.part_id;
  return new;
end;
$$;
