# 8130 APP — Database Schema (public)

17 tables in the `public` schema. Structure only, no data.

---

## `app_errors`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| build_time | text | yes |  |  |
| employee_number | integer | yes |  |  |
| id | uuid | no | gen_random_uuid() | PK; Note:
This is a Primary Key.<pk/> |
| message | text | yes |  |  |
| occurred_at | timestamp with time zone | no | now() |  |
| stack | text | yes |  |  |
| url | text | yes |  |  |
| user_agent | text | yes |  |  |

## `app_settings`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| key | text | no |  | PK; Note:
This is a Primary Key.<pk/> |
| updated_at | timestamp with time zone | no | now() |  |
| value | text | no |  |  |

## `call_comments`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| author_employee_number | integer | yes |  | FK → employees.employee_number; Note:
This is a Foreign Key to `employees.employee_number`.<fk table='employees' column='employee_number'/> |
| call_id | uuid | no |  | FK → service_calls.id; Note:
This is a Foreign Key to `service_calls.id`.<fk table='service_calls' column='id'/> |
| created_at | timestamp with time zone | no | now() |  |
| id | uuid | no | gen_random_uuid() | PK; Note:
This is a Primary Key.<pk/> |
| text | text | no |  |  |

## `call_required_parts`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| awaiting_receipt_since | timestamp with time zone | yes |  |  |
| call_id | uuid | yes |  | FK → service_calls.id; Note:
This is a Foreign Key to `service_calls.id`.<fk table='service_calls' column='id'/> |
| id | uuid | no | gen_random_uuid() | PK; Note:
This is a Primary Key.<pk/> |
| order_number | text | yes |  |  |
| part_id | uuid | no |  | FK → parts.id; Note:
This is a Foreign Key to `parts.id`.<fk table='parts' column='id'/> |
| quantity | integer | no |  |  |
| rejection_reason | text | yes |  |  |
| requested_at | timestamp with time zone | no | now() |  |
| requested_by | integer | yes |  | FK → employees.employee_number; Note:
This is a Foreign Key to `employees.employee_number`.<fk table='employees' column='employee_number'/> |
| status | public.required_part_status | no | in_stock | enum: in_stock, awaiting_order, awaiting_receipt, received, delivered, rejected, pending_special_approval, rejected_final, not_consumed, wear, wear_credited |
| warehouse_order_id | uuid | yes |  | FK → warehouse_orders.id; Note:
This is a Foreign Key to `warehouse_orders.id`.<fk table='warehouse_orders' column='id'/> |

## `class_orders`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| call_id | uuid | no |  | FK → service_calls.id; Note:
This is a Foreign Key to `service_calls.id`.<fk table='service_calls' column='id'/> |
| class_required | text | no |  |  |
| contact_name | text | yes |  |  |
| contact_phone | text | yes |  |  |
| created_at | timestamp with time zone | no | now() |  |
| created_by | integer | yes |  | FK → employees.employee_number; Note:
This is a Foreign Key to `employees.employee_number`.<fk table='employees' column='employee_number'/> |
| crossing_gvul | text | no |  |  |
| fault | text | yes |  |  |
| id | uuid | no | gen_random_uuid() | PK; Note:
This is a Primary Key.<pk/> |
| location | text | yes |  |  |
| model | text | yes |  |  |
| parts_available | text | yes |  |  |
| target_date | date | no |  |  |
| tsakah | text | yes |  |  |
| updated_at | timestamp with time zone | no | now() |  |
| vehicle_number | text | yes |  |  |

## `employee_availability`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| date | date | no |  | PK; Note:
This is a Primary Key.<pk/> |
| employee_number | integer | no |  | PK; FK → employees.employee_number; Note:
This is a Primary Key.<pk/>
This is a Foreign Key to `employees.employee_number`.<fk table='employees' column='employee_number'/> |
| reason | text | yes |  |  |

## `employees`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| created_at | timestamp with time zone | no | now() |  |
| employee_number | integer | no |  | PK; Note:
This is a Primary Key.<pk/> |
| exclude_from_availability_report | boolean | no |  |  |
| name | text | no |  |  |
| permissions | public.employee_permissions | no | technician | enum: technician, manager, warehouse |
| phone | text | yes |  |  |
| profession_name | text | yes |  |  |
| specialty | text | yes |  |  |

## `feedback_notes`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| author_employee_number | integer | no |  | FK → employees.employee_number; Note:
This is a Foreign Key to `employees.employee_number`.<fk table='employees' column='employee_number'/> |
| author_name | text | no |  |  |
| component_ids | smallint[] | no |  |  |
| created_at | timestamp with time zone | no | now() |  |
| display_id | text | no |  |  |
| id | uuid | no | gen_random_uuid() | PK; Note:
This is a Primary Key.<pk/> |
| page_path | text | no | / |  |
| status | text | no | new |  |
| text | text | no |  |  |
| updated_at | timestamp with time zone | no | now() |  |

## `inventory_count_entries`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| counted_at | timestamp with time zone | no | now() |  |
| counted_by | integer | no |  | FK → employees.employee_number; Note:
This is a Foreign Key to `employees.employee_number`.<fk table='employees' column='employee_number'/> |
| counted_qty | integer | no |  |  |
| expected_qty | integer | no |  |  |
| id | uuid | no | gen_random_uuid() | PK; Note:
This is a Primary Key.<pk/> |
| part_id | uuid | no |  | FK → parts.id; Note:
This is a Foreign Key to `parts.id`.<fk table='parts' column='id'/> |
| session_id | uuid | no |  | FK → inventory_count_sessions.id; Note:
This is a Foreign Key to `inventory_count_sessions.id`.<fk table='inventory_count_sessions' column='id'/> |

## `inventory_count_sessions`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| closed_at | timestamp with time zone | yes |  |  |
| id | uuid | no | gen_random_uuid() | PK; Note:
This is a Primary Key.<pk/> |
| opened_at | timestamp with time zone | no | now() |  |
| opened_by | integer | no |  | FK → employees.employee_number; Note:
This is a Foreign Key to `employees.employee_number`.<fk table='employees' column='employee_number'/> |
| status | text | no | open |  |

## `part_withdrawals`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| call_id | uuid | no |  | FK → service_calls.id; Note:
This is a Foreign Key to `service_calls.id`.<fk table='service_calls' column='id'/> |
| id | uuid | no | gen_random_uuid() | PK; Note:
This is a Primary Key.<pk/> |
| is_external | boolean | no |  |  |
| part_id | uuid | no |  | FK → parts.id; Note:
This is a Foreign Key to `parts.id`.<fk table='parts' column='id'/> |
| quantity | integer | no |  |  |
| released_by | integer | no |  | FK → employees.employee_number; Note:
This is a Foreign Key to `employees.employee_number`.<fk table='employees' column='employee_number'/> |
| required_part_id | uuid | yes |  | FK → call_required_parts.id; Note:
This is a Foreign Key to `call_required_parts.id`.<fk table='call_required_parts' column='id'/> |
| withdrawn_at | timestamp with time zone | no | now() |  |
| withdrawn_by | integer | no |  | FK → employees.employee_number; Note:
This is a Foreign Key to `employees.employee_number`.<fk table='employees' column='employee_number'/> |

## `parts`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| cabinet | smallint | yes |  |  |
| cell_number | smallint | yes |  |  |
| created_at | timestamp with time zone | no | now() |  |
| hide_from_blocked_table | boolean | no |  |  |
| id | uuid | no | gen_random_uuid() | PK; Note:
This is a Primary Key.<pk/> |
| is_exchange | boolean | no |  |  |
| is_sku_blocked | boolean | no |  |  |
| location | text | yes |  |  |
| min_threshold | integer | no |  |  |
| name | text | no |  |  |
| pending_approval | boolean | no |  |  |
| quantity | integer | no |  |  |
| replacement_sku | text | yes |  |  |
| seq | smallint | no | 1 |  |
| sku | text | no |  |  |
| stock_count | integer | no |  |  |
| storage_number | smallint | yes |  |  |
| storage_type | text | yes |  |  |
| supplier | text | yes |  |  |
| warehouse | text | yes |  |  |

## `professions`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| created_at | timestamp with time zone | no | now() |  |
| id | smallint | no |  | PK; Note:
This is a Primary Key.<pk/> |
| name | text | no |  |  |

## `service_calls`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| anomaly_flags | jsonb | no |  |  |
| closed_at | timestamp with time zone | yes |  |  |
| closed_by | integer | yes |  | FK → employees.employee_number; Note:
This is a Foreign Key to `employees.employee_number`.<fk table='employees' column='employee_number'/> |
| created_at | timestamp with time zone | no | now() |  |
| description | text | yes |  |  |
| display_id | text | no |  |  |
| external_id | text | yes |  |  |
| id | uuid | no | gen_random_uuid() | PK; Note:
This is a Primary Key.<pk/> |
| is_disabling | boolean | no |  |  |
| profession_name | text | yes |  |  |
| reporter_name | text | yes |  |  |
| reporter_phone | text | yes |  |  |
| specialties | text[] | no |  |  |
| status | public.call_status | no | new | enum: new, in_treatment, waiting_for_parts, closed, cancelled |
| updated_at | timestamp with time zone | no | now() |  |
| vehicle_name | text | yes |  |  |
| vehicle_number | text | yes |  | Free text — may not match any row in vehicles. Anomaly flag set if so. |

## `tank_monthly_maintenance`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| created_at | timestamp with time zone | no | now() |  |
| vehicle_number | text | no |  | PK; FK → vehicles.vehicle_number; Note:
This is a Primary Key.<pk/>
This is a Foreign Key to `vehicles.vehicle_number`.<fk table='vehicles' column='vehicle_number'/> |
| week_start | date | no |  | PK; Note:
This is a Primary Key.<pk/> |

## `vehicles`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| created_at | timestamp with time zone | no | now() |  |
| current_engine_hours | integer | yes |  |  |
| current_kilometers | integer | yes |  |  |
| department | text | yes |  |  |
| important_note | text | yes |  |  |
| important_note_color | text | yes |  |  |
| initial_engine_hours | integer | yes |  |  |
| location | text | yes |  |  |
| model | text | yes |  |  |
| sub_department | text | yes |  |  |
| type_name | text | no |  |  |
| vehicle_number | text | no |  | PK; Note:
This is a Primary Key.<pk/> |

## `warehouse_orders`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| created_at | timestamp with time zone | no | now() |  |
| created_by | integer | yes |  | FK → employees.employee_number; Note:
This is a Foreign Key to `employees.employee_number`.<fk table='employees' column='employee_number'/> |
| display_id | text | no |  |  |
| id | uuid | no | gen_random_uuid() | PK; Note:
This is a Primary Key.<pk/> |
