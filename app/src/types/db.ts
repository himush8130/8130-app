// =====================================================================
// 8130 APP — DB row types
// =====================================================================
// Hand-authored to match the schema in supabase/migrations/.
// Future improvement: generate from Supabase via `supabase gen types`.
// =====================================================================

export type EmployeeRole = 'technician' | 'manager' | 'warehouse'

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

export interface Profession {
  id: number
  name: string
  created_at: string
}

export interface Employee {
  employee_number: number
  name: string
  phone: string | null
  profession_id: number | null
  role: EmployeeRole
  created_at: string
}

export interface Vehicle {
  vehicle_number: string
  type_id: number
  model: string | null
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
  profession_id: number | null
  anomaly_flags: Array<{ code: string; detail?: string }>
  created_at: string
  updated_at: string
  closed_at: string | null
  closed_by: number | null
  /** Embedded via PostgREST: select('*, professions(name)') */
  professions?: { name: string } | null
}

export interface CallComment {
  id: string
  call_id: string
  author_employee_number: number | null
  text: string
  created_at: string
}
