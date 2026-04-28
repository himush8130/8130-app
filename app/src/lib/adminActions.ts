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
