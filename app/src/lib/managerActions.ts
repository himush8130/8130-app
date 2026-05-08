import { supabase } from './supabase'

const FUNCTION_NAME = 'manager-actions'

interface CallActionResult {
  ok: boolean
  call?: { id: string; display_id: string; status: string }
  error?: string
  detail?: string
}

async function invoke(body: Record<string, unknown>): Promise<CallActionResult> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body })
  if (error) {
    return { ok: false, error: 'invoke_failed', detail: error.message }
  }
  return data as CallActionResult
}

export async function resolveAnomalySetProfession(
  employeeNumber: number,
  callId: string,
  professionName: string,
): Promise<CallActionResult> {
  return invoke({
    employee_number: employeeNumber,
    action: 'resolve_anomaly_set_profession',
    params: { call_id: callId, profession_name: professionName },
  })
}

export async function resolveAnomalyFixVehicle(
  employeeNumber: number,
  callId: string,
  vehicleNumber: string,
): Promise<CallActionResult> {
  return invoke({
    employee_number: employeeNumber,
    action: 'resolve_anomaly_fix_vehicle',
    params: { call_id: callId, vehicle_number: vehicleNumber },
  })
}

export async function cancelCall(
  employeeNumber: number,
  callId: string,
): Promise<CallActionResult> {
  return invoke({
    employee_number: employeeNumber,
    action: 'cancel_call',
    params: { call_id: callId },
  })
}

export async function closeCall(
  employeeNumber: number,
  callId: string,
): Promise<CallActionResult> {
  return invoke({
    employee_number: employeeNumber,
    action: 'close_call',
    params: { call_id: callId },
  })
}

export async function reopenCall(
  employeeNumber: number,
  callId: string,
): Promise<CallActionResult> {
  return invoke({
    employee_number: employeeNumber,
    action: 'reopen_call',
    params: { call_id: callId },
  })
}

export async function addComment(
  employeeNumber: number,
  callId: string,
  text: string,
): Promise<CallActionResult> {
  return invoke({
    employee_number: employeeNumber,
    action: 'add_comment',
    params: { call_id: callId, text },
  })
}

export async function setCallDisabling(
  employeeNumber: number,
  callId: string,
  isDisabling: boolean,
): Promise<CallActionResult> {
  return invoke({
    employee_number: employeeNumber,
    action: 'set_call_disabling',
    params: { call_id: callId, is_disabling: isDisabling },
  })
}

export async function setCallSpecialties(
  employeeNumber: number,
  callId: string,
  specialties: string[],
): Promise<CallActionResult> {
  return invoke({
    employee_number: employeeNumber,
    action: 'set_call_specialties',
    params: { call_id: callId, specialties },
  })
}

export interface CreateCallParams {
  vehicle_number: string
  description: string
  reporter_phone?: string | null
  is_disabling?: boolean
  specialties?: string[]
}

export async function createCall(
  employeeNumber: number,
  params: CreateCallParams,
): Promise<CallActionResult & { anomalies?: Array<{ code: string; detail?: string }> }> {
  return invoke({
    employee_number: employeeNumber,
    action: 'create_call',
    params,
  }) as any
}

export interface CallUpdates {
  vehicle_number?: string | null
  description?:    string | null
  reporter_name?:  string | null
  reporter_phone?: string | null
  is_disabling?:   boolean
  specialties?:    string[]
}

export async function editCall(
  employeeNumber: number,
  callId: string,
  updates: CallUpdates,
): Promise<CallActionResult> {
  return invoke({
    employee_number: employeeNumber,
    action: 'edit_call',
    params: { call_id: callId, updates },
  })
}

export async function deleteCall(
  employeeNumber: number,
  callId: string,
): Promise<CallActionResult> {
  return invoke({
    employee_number: employeeNumber,
    action: 'delete_call',
    params: { call_id: callId },
  })
}

export async function editComment(
  employeeNumber: number,
  commentId: string,
  text: string,
): Promise<CallActionResult> {
  return invoke({
    employee_number: employeeNumber,
    action: 'edit_comment',
    params: { comment_id: commentId, text },
  })
}

export async function deleteComment(
  employeeNumber: number,
  commentId: string,
): Promise<CallActionResult> {
  return invoke({
    employee_number: employeeNumber,
    action: 'delete_comment',
    params: { comment_id: commentId },
  })
}
