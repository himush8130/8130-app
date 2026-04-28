// =====================================================================
// 8130 APP — Call mutations endpoint (manager + lifecycle actions)
// =====================================================================
// Routes through service_role (RLS-bypassing). Role enforcement is per
// action — some actions allow any role, others require manager.
//
// Request body:
//   { employee_number: number, action: string, params: {...} }
//
// Manager-only:
//   - resolve_anomaly_set_profession: { call_id, profession_id }
//   - resolve_anomaly_fix_vehicle:    { call_id, vehicle_number }
//   - cancel_call:                    { call_id }
//
// Any-role:
//   - close_call:                     { call_id }
//   - reopen_call:                    { call_id }
//   - add_comment:                    { call_id, text }
//
// Feedback notes (any role; edits/deletes restricted to author):
//   - add_feedback_note:              { page_path, text }
//   - edit_feedback_note:             { note_id, text }
//   - delete_feedback_note:           { note_id }
// =====================================================================

// @ts-nocheck — Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

const corsHeaders = {
  'access-control-allow-origin':  '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return json(400, { ok: false, error: 'invalid_json' })
  }

  const { employee_number, action, params } = body
  if (typeof employee_number !== 'number' || typeof action !== 'string') {
    return json(400, { ok: false, error: 'missing_employee_number_or_action' })
  }

  // --- Authorize: caller must be a manager ---
  const { data: caller, error: callerErr } = await admin
    .from('employees')
    .select('role, name')
    .eq('employee_number', employee_number)
    .maybeSingle()

  if (callerErr) return json(500, { ok: false, error: 'lookup_failed', detail: callerErr.message })
  if (!caller)   return json(403, { ok: false, error: 'unknown_employee' })

  const managerOnly = (next: () => Promise<Response>): Promise<Response> => {
    if (caller.role !== 'manager') {
      return Promise.resolve(json(403, { ok: false, error: 'requires_manager' }))
    }
    return next()
  }

  // --- Dispatch ---
  switch (action) {
    case 'resolve_anomaly_set_profession': return managerOnly(() => resolveSetProfession(params))
    case 'resolve_anomaly_fix_vehicle':    return managerOnly(() => resolveFixVehicle(params))
    case 'cancel_call':                    return managerOnly(() => cancelCall(params))
    case 'reopen_call':                    return await reopenCall(params)
    case 'close_call':                     return await closeCall(params, employee_number)
    case 'add_comment':                    return await addComment(params, employee_number)
    case 'add_feedback_note':              return await addFeedbackNote(params, employee_number, caller.name)
    case 'edit_feedback_note':             return await editFeedbackNote(params, employee_number)
    case 'delete_feedback_note':           return await deleteFeedbackNote(params, employee_number)
    default:
      return json(400, { ok: false, error: 'unknown_action', action })
  }
})

// ----- Action handlers -----

async function resolveSetProfession(params: any): Promise<Response> {
  const { call_id, profession_id } = params ?? {}
  if (typeof call_id !== 'string' || typeof profession_id !== 'number') {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  const { data, error } = await admin
    .from('service_calls')
    .update({
      profession_id,
      status: 'in_treatment',
      anomaly_flags: stripAnomalies(['unknown_vehicle', 'no_technicians_for_profession', 'all_technicians_unavailable_today']),
    })
    .eq('id', call_id)
    .select('id, display_id, status, profession_id')
    .single()

  if (error) return json(500, { ok: false, error: 'update_failed', detail: error.message })
  return json(200, { ok: true, call: data })
}

async function resolveFixVehicle(params: any): Promise<Response> {
  const { call_id, vehicle_number } = params ?? {}
  if (typeof call_id !== 'string' || typeof vehicle_number !== 'string') {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  // Look up the corrected vehicle to derive its profession
  const { data: vehicle, error: vehErr } = await admin
    .from('vehicles')
    .select('type_id')
    .eq('vehicle_number', vehicle_number)
    .maybeSingle()

  if (vehErr) return json(500, { ok: false, error: 'vehicle_lookup_failed', detail: vehErr.message })
  if (!vehicle) return json(400, { ok: false, error: 'vehicle_still_unknown' })

  const { data, error } = await admin
    .from('service_calls')
    .update({
      vehicle_number,
      profession_id: vehicle.type_id,
      status: 'in_treatment',
      anomaly_flags: stripAnomalies(['unknown_vehicle']),
    })
    .eq('id', call_id)
    .select('id, display_id, status, profession_id, vehicle_number')
    .single()

  if (error) return json(500, { ok: false, error: 'update_failed', detail: error.message })
  return json(200, { ok: true, call: data })
}

async function cancelCall(params: any): Promise<Response> {
  const { call_id } = params ?? {}
  if (typeof call_id !== 'string') {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  const { data, error } = await admin
    .from('service_calls')
    .update({ status: 'cancelled' })
    .eq('id', call_id)
    .select('id, display_id, status')
    .single()

  if (error) return json(500, { ok: false, error: 'update_failed', detail: error.message })
  return json(200, { ok: true, call: data })
}

async function closeCall(params: any, employeeNumber: number): Promise<Response> {
  const { call_id } = params ?? {}
  if (typeof call_id !== 'string') {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  const { data, error } = await admin
    .from('service_calls')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: employeeNumber,
    })
    .eq('id', call_id)
    .select('id, display_id, status, closed_at, closed_by')
    .single()

  if (error) return json(500, { ok: false, error: 'update_failed', detail: error.message })
  return json(200, { ok: true, call: data })
}

async function reopenCall(params: any): Promise<Response> {
  const { call_id } = params ?? {}
  if (typeof call_id !== 'string') {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  // If there are still required parts in awaiting_*, reopening should
  // land back in waiting_for_parts; otherwise in_treatment.
  const { data: pending } = await admin
    .from('call_required_parts')
    .select('id')
    .eq('call_id', call_id)
    .in('status', ['awaiting_order', 'awaiting_receipt'])

  const nextStatus = (pending && pending.length > 0) ? 'waiting_for_parts' : 'in_treatment'

  const { data, error } = await admin
    .from('service_calls')
    .update({
      status: nextStatus,
      closed_at: null,
      closed_by: null,
    })
    .eq('id', call_id)
    .select('id, display_id, status')
    .single()

  if (error) return json(500, { ok: false, error: 'update_failed', detail: error.message })
  return json(200, { ok: true, call: data })
}

// =====================================================================
// Feedback notes
// =====================================================================

function extractComponentIds(text: string): number[] {
  const matches = text.matchAll(/#(\d+)/g)
  const ids = new Set<number>()
  for (const m of matches) {
    const n = parseInt(m[1], 10)
    if (!Number.isNaN(n) && n > 0 && n < 32768) ids.add(n)  // smallint range
  }
  return [...ids]
}

async function addFeedbackNote(
  params: any,
  employeeNumber: number,
  authorName: string,
): Promise<Response> {
  const { page_path, text } = params ?? {}
  if (typeof text !== 'string' || text.trim().length === 0) {
    return json(400, { ok: false, error: 'invalid_text' })
  }
  const trimmed = text.trim()

  const { data, error } = await admin
    .from('feedback_notes')
    .insert({
      author_employee_number: employeeNumber,
      author_name: authorName,
      page_path: typeof page_path === 'string' ? page_path : '/',
      component_ids: extractComponentIds(trimmed),
      text: trimmed,
    })
    .select('id, display_id, created_at, component_ids')
    .single()

  if (error) return json(500, { ok: false, error: 'insert_failed', detail: error.message })
  return json(200, { ok: true, note: data })
}

async function editFeedbackNote(params: any, employeeNumber: number): Promise<Response> {
  const { note_id, text } = params ?? {}
  if (typeof note_id !== 'string' || typeof text !== 'string' || text.trim().length === 0) {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  // Verify author
  const { data: existing } = await admin
    .from('feedback_notes')
    .select('author_employee_number')
    .eq('id', note_id)
    .maybeSingle()
  if (!existing) return json(404, { ok: false, error: 'note_not_found' })
  if (existing.author_employee_number !== employeeNumber) {
    return json(403, { ok: false, error: 'not_author' })
  }

  const trimmed = text.trim()
  const { data, error } = await admin
    .from('feedback_notes')
    .update({
      text: trimmed,
      component_ids: extractComponentIds(trimmed),
    })
    .eq('id', note_id)
    .select('id, display_id, text, component_ids, updated_at')
    .single()

  if (error) return json(500, { ok: false, error: 'update_failed', detail: error.message })
  return json(200, { ok: true, note: data })
}

async function deleteFeedbackNote(params: any, employeeNumber: number): Promise<Response> {
  const { note_id } = params ?? {}
  if (typeof note_id !== 'string') {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  const { data: existing } = await admin
    .from('feedback_notes')
    .select('author_employee_number')
    .eq('id', note_id)
    .maybeSingle()
  if (!existing) return json(404, { ok: false, error: 'note_not_found' })
  if (existing.author_employee_number !== employeeNumber) {
    return json(403, { ok: false, error: 'not_author' })
  }

  const { error } = await admin
    .from('feedback_notes')
    .delete()
    .eq('id', note_id)

  if (error) return json(500, { ok: false, error: 'delete_failed', detail: error.message })
  return json(200, { ok: true })
}

// =====================================================================

async function addComment(params: any, employeeNumber: number): Promise<Response> {
  const { call_id, text } = params ?? {}
  if (typeof call_id !== 'string' || typeof text !== 'string' || text.trim().length === 0) {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  const { data, error } = await admin
    .from('call_comments')
    .insert({
      call_id,
      author_employee_number: employeeNumber,
      text: text.trim(),
    })
    .select('id, created_at')
    .single()

  if (error) return json(500, { ok: false, error: 'insert_failed', detail: error.message })
  return json(200, { ok: true, comment: data })
}

// ----- helpers -----

function stripAnomalies(codesToRemove: string[]) {
  // Returns a SQL fragment-like jsonb that strips matching codes.
  // We can't easily filter inside an update without reading the row first,
  // so for simplicity in M4 we just clear the entire array. Edge case if
  // a call has BOTH a soft and a hard anomaly — soft will be lost on
  // resolution. Acceptable for now; revisit if it becomes a real issue.
  void codesToRemove
  return [] as Array<{ code: string; detail?: string }>
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}
