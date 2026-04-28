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
  professionId: number,
): Promise<CallActionResult> {
  return invoke({
    employee_number: employeeNumber,
    action: 'resolve_anomaly_set_profession',
    params: { call_id: callId, profession_id: professionId },
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
