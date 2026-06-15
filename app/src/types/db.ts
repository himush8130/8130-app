// =====================================================================
// 8130 APP — DB row types
// =====================================================================
// Hand-authored to match the schema in supabase/migrations/.
// Future improvement: generate from Supabase via `supabase gen types`.
// =====================================================================

export type EmployeePermissions = 'technician' | 'manager' | 'warehouse' | 'commander_viewer'

/** Backwards-compatible alias for code paths that haven't been renamed. */
export type EmployeeRole = EmployeePermissions

export type CallStatus =
  | 'new'
  | 'in_treatment'
  | 'waiting_for_parts'
  | 'closed'
  | 'cancelled'

export type RequiredPartStatus =
  | 'in_stock'
  | 'awaiting_order'
  | 'awaiting_receipt'
  | 'received'
  | 'delivered'
  | 'rejected'
  | 'pending_special_approval'
  | 'rejected_final'
  | 'not_consumed'
  | 'wear'
  | 'wear_credited'

export interface Profession {
  id: number
  name: string
  created_at: string
}

export interface Employee {
  employee_number: number
  name: string
  phone: string | null
  profession_name: string | null
  permissions: EmployeePermissions
  specialty: TankSpecialty | null
  exclude_from_availability_report: boolean
  created_at: string
}

export type TankSpecialty = 'מכונאות' | 'חשמל' | 'צריח' | 'בק״ש'

export const TANK_SPECIALTIES: TankSpecialty[] = ['מכונאות', 'חשמל', 'צריח', 'בק״ש']

export type VehicleNoteColor = 'yellow' | 'red' | 'green' | 'blue' | 'gray'
export const VEHICLE_NOTE_COLORS: VehicleNoteColor[] = ['yellow', 'red', 'green', 'blue', 'gray']

export interface Vehicle {
  vehicle_number: string
  type_name: string
  department: string | null
  sub_department: string | null
  location: string | null
  model: string | null
  important_note: string | null
  important_note_color: VehicleNoteColor | null
  initial_engine_hours: number | null
  current_engine_hours: number | null
  current_kilometers: number | null
  created_at: string
}

export interface ServiceCall {
  id: string
  display_id: string
  external_id: string | null
  vehicle_name: string | null
  vehicle_number: string | null
  reporter_name: string | null
  reporter_phone: string | null
  description: string | null
  status: CallStatus
  profession_name: string | null
  anomaly_flags: Array<{ code: string; detail?: string }>
  is_disabling: boolean
  specialties: TankSpecialty[]
  created_at: string
  updated_at: string
  closed_at: string | null
  closed_by: number | null
}

export interface CallComment {
  id: string
  call_id: string
  author_employee_number: number | null
  text: string
  created_at: string
}
