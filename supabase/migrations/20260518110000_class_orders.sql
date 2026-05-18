-- =====================================================================
-- 8130 APP — Class orders ("דרישת כיתת אחזקה")
-- =====================================================================
-- Persisted form-state behind the "הזמן כיתה" panel. Filled by the
-- technician inside a call, surfaced to the manager as a table with
-- per-row "copy as WhatsApp text" + link to the source call. The copy
-- button is hidden from the technician — the technician only saves;
-- the manager dispatches.
--
-- One open class order per call to keep the upsert semantics simple:
-- a follow-up request for the same call replaces the previous draft.
-- =====================================================================

create table public.class_orders (
  id              uuid primary key default gen_random_uuid(),
  call_id         uuid not null references public.service_calls(id) on delete cascade,
  tsakah          text,                                 -- צק״ח (from app_settings at save time)
  model           text,                                 -- סוג צלם (vehicle.model snapshot)
  class_required  text not null,                        -- כיתה נדרשת
  vehicle_number  text,                                 -- צ' formatted snapshot
  fault           text,                                 -- תקלה
  parts_available text,                                 -- 'יש' / 'אין'
  target_date     date not null,                        -- תאריך עתידי
  location        text,                                 -- מיקום
  contact_name    text,                                 -- איש קשר (technician name snapshot)
  contact_phone   text,                                 -- מס' פלאפון
  crossing_gvul   text not null,                        -- 'yes' / 'no'
  created_by      integer references public.employees(employee_number) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Enforce one row per call so re-saving from the panel is an upsert,
-- not an accidental duplicate request.
create unique index class_orders_one_per_call on public.class_orders (call_id);

create index class_orders_created_at_idx on public.class_orders (created_at desc);

create trigger trg_class_orders_updated_at
  before update on public.class_orders
  for each row
  execute function public.fn_touch_updated_at();

alter table public.class_orders enable row level security;
create policy "anon read"
  on public.class_orders for select to anon, authenticated using (true);
-- Writes go through the admin-actions edge function with the service role.
