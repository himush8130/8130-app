-- =====================================================================
-- 8130 APP — Development seed data
-- =====================================================================
-- Hebrew dummy data for development. Volumes:
--   3 professions, 5 employees, 5 vehicles, 10 parts.
-- All employee numbers, vehicle numbers, and SKUs are fictional.
-- =====================================================================

-- ----- Professions -----
insert into public.professions (id, name) values
  (1, 'רכב'),
  (2, 'חשמל'),
  (3, 'אופטיקה')
on conflict (id) do nothing;

-- Push the sequence past our hard-coded ids so future inserts continue cleanly.
select setval('public.professions_id_seq', (select max(id) from public.professions));


-- ----- Employees -----
-- Roles: 1 manager, 1 warehouse, 3 technicians (one per profession).
insert into public.employees (employee_number, name, phone, profession_id, role) values
  (1001, 'נועה ברק',       '050-1110001', null, 'manager'),
  (1002, 'אבי כהן',         '050-1110002', null, 'warehouse'),
  (1003, 'יואב לוי',         '050-1110003', 1,    'technician'),  -- רכב
  (1004, 'שרון ישראלי',     '050-1110004', 2,    'technician'),  -- חשמל
  (1005, 'דנה אברהם',       '050-1110005', 3,    'technician')   -- אופטיקה
on conflict (employee_number) do nothing;


-- ----- Vehicles -----
-- type_id matches a profession; the auto-assignment algorithm uses this.
insert into public.vehicles (vehicle_number, type_id, model) values
  ('12-345-67', 1, 'טויוטה היילקס 2022'),
  ('23-456-78', 2, 'פורד טרנזיט 2021'),
  ('34-567-89', 1, 'איסוזו די-מקס 2020'),
  ('45-678-90', 3, 'מצלמת בקרה ניידת — דגם A1'),
  ('56-789-01', 2, 'מנוע גנרטור — דגם G500')
on conflict (vehicle_number) do nothing;


-- ----- Parts catalog (10 dummy items) -----
insert into public.parts (sku, name, quantity, location, min_threshold, supplier) values
  ('PRT-0001', 'מסנן שמן',                 25, 'מדף A1', 5,  'ספק רכב צפון'),
  ('PRT-0002', 'רצועת מנוע',                8,  'מדף A2', 3,  'ספק רכב צפון'),
  ('PRT-0003', 'מצבר 60 אמפר',              6,  'מדף B1', 2,  'אלקטרו ש.ב.'),
  ('PRT-0004', 'נתיך 10A',                 200, 'מגירה C1', 50, 'אלקטרו ש.ב.'),
  ('PRT-0005', 'נורת LED 24V',              40, 'מגירה C2', 10, 'אלקטרו ש.ב.'),
  ('PRT-0006', 'עדשה אופטית 50mm',          12, 'מדף D1', 4,  'אופטיקה ירושלים'),
  ('PRT-0007', 'מסנן UV',                   18, 'מדף D2', 6,  'אופטיקה ירושלים'),
  ('PRT-0008', 'בורג M6 (חבילה 100)',      15, 'מגירה E1', 3,  'מבנה כללי בע״מ'),
  ('PRT-0009', 'שמן הידראולי 5L',           4,  'מדף F1', 2,  'ספק רכב צפון'),
  ('PRT-0010', 'כבל חשמל 2.5mm (מטר)',    300, 'מדף B2', 50, 'אלקטרו ש.ב.')
on conflict (sku) do nothing;


-- ----- Sanity output -----
do $$
declare
  c_prof int; c_emp int; c_veh int; c_par int;
begin
  select count(*) into c_prof from public.professions;
  select count(*) into c_emp  from public.employees;
  select count(*) into c_veh  from public.vehicles;
  select count(*) into c_par  from public.parts;
  raise notice 'Seed loaded — professions=%, employees=%, vehicles=%, parts=%', c_prof, c_emp, c_veh, c_par;
end$$;
