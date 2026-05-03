-- =====================================================================
-- 8130 APP — Add sub_department to vehicles
-- =====================================================================
-- The worker's vehicles.xlsx now has a "תת מחלקה" column. This adds
-- the matching nullable text column on the database side. Existing
-- rows get NULL.
-- =====================================================================

alter table public.vehicles
  add column sub_department text;
