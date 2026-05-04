import { supabase } from './supabase'
import type { RequiredPartStatus } from '../types/db'

const FUNCTION_NAME = 'warehouse-actions'

interface ActionResult<T = unknown> {
  ok: boolean
  error?: string
  detail?: string
  available?: number
  required_part?: T
  withdrawal?: T
}

async function invoke<T = unknown>(body: Record<string, unknown>): Promise<ActionResult<T>> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body })
  if (error) return { ok: false, error: 'invoke_failed', detail: error.message }
  return data as ActionResult<T>
}

export function addRequiredPart(
  employeeNumber: number,
  callId: string,
  partId: string,
  quantity: number,
) {
  return invoke({
    employee_number: employeeNumber,
    action: 'add_required_part',
    params: { call_id: callId, part_id: partId, quantity },
  })
}

export function updateRequiredPartStatus(
  employeeNumber: number,
  requiredPartId: string,
  status: RequiredPartStatus,
) {
  return invoke({
    employee_number: employeeNumber,
    action: 'update_required_part_status',
    params: { required_part_id: requiredPartId, status },
  })
}

export function recordWithdrawal(
  employeeNumber: number,
  callId: string,
  partId: string,
  quantity: number,
  withdrawnBy: number,
  requiredPartId?: string,
) {
  return invoke({
    employee_number: employeeNumber,
    action: 'record_withdrawal',
    params: {
      call_id: callId,
      part_id: partId,
      quantity,
      withdrawn_by: withdrawnBy,
      required_part_id: requiredPartId,
    },
  })
}
