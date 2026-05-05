import { supabase } from './supabase'

const FUNCTION_NAME = 'admin-actions'

export interface AdminResult {
  ok: boolean
  error?: string
  detail?: string
  vehicles?: number
  employees?: number
  profession?: { id: number; name: string }
}

async function invoke(body: Record<string, unknown>): Promise<AdminResult> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body })
  if (error) return { ok: false, error: 'invoke_failed', detail: error.message }
  return data as AdminResult
}

export function createProfession(employeeNumber: number, name: string) {
  return invoke({
    employee_number: employeeNumber,
    action: 'create_profession',
    params: { name },
  })
}

export function updateProfession(employeeNumber: number, id: number, name: string) {
  return invoke({
    employee_number: employeeNumber,
    action: 'update_profession',
    params: { id, name },
  })
}

export function deleteProfession(employeeNumber: number, id: number) {
  return invoke({
    employee_number: employeeNumber,
    action: 'delete_profession',
    params: { id },
  })
}

// ----- Employees -----

export interface EmployeeUpdates {
  name?: string
  phone?: string | null
  profession_name?: string | null
  permissions?: 'technician' | 'manager' | 'warehouse'
  specialty?: string | null
}

export function createEmployee(employeeNumber: number, payload: { employee_number: number } & EmployeeUpdates) {
  return invoke({
    employee_number: employeeNumber,
    action: 'create_employee',
    params: payload,
  })
}

export function updateEmployee(employeeNumber: number, target: number, updates: EmployeeUpdates) {
  return invoke({
    employee_number: employeeNumber,
    action: 'update_employee',
    params: { employee_number: target, updates },
  })
}

export function deleteEmployee(employeeNumber: number, target: number) {
  return invoke({
    employee_number: employeeNumber,
    action: 'delete_employee',
    params: { employee_number: target },
  })
}

// ----- Vehicles -----

export interface VehicleUpdates {
  type_name?: string
  department?: string | null
  sub_department?: string | null
  location?: string | null
}

export function createVehicle(employeeNumber: number, payload: { vehicle_number: string } & VehicleUpdates) {
  return invoke({
    employee_number: employeeNumber,
    action: 'create_vehicle',
    params: payload,
  })
}

export function updateVehicle(employeeNumber: number, vehicleNumber: string, updates: VehicleUpdates) {
  return invoke({
    employee_number: employeeNumber,
    action: 'update_vehicle',
    params: { vehicle_number: vehicleNumber, updates },
  })
}

export function deleteVehicle(employeeNumber: number, vehicleNumber: string) {
  return invoke({
    employee_number: employeeNumber,
    action: 'delete_vehicle',
    params: { vehicle_number: vehicleNumber },
  })
}

// ----- Availability -----

export function setEmployeeAvailability(
  employeeNumber: number,
  target: number,
  date: string,
  available: boolean,
  reason?: string | null,
) {
  return invoke({
    employee_number: employeeNumber,
    action: 'set_availability',
    params: { employee_number: target, date, available, reason: reason ?? null },
  })
}
