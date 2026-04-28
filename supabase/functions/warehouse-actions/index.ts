// =====================================================================
// 8130 APP — Warehouse / parts mutations
// =====================================================================
// Endpoint for all parts-related writes. Like manager-actions, validates
// the caller's role inside the function (RLS bypassed via service_role).
//
// Request body:
//   { employee_number: number, action: string, params: {...} }
//
// Actions:
//   - add_required_part:           {call_id, part_sku, quantity}        (any role)
//   - update_required_part_status: {required_part_id, status}           (warehouse)
//   - record_withdrawal:           {call_id, part_sku, quantity, withdrawn_by}  (warehouse)
//
// On `add_required_part` the function auto-classifies status:
//   if parts.quantity >= requested -> 'in_stock'
//   else -> 'awaiting_order'
//   The call's status is also updated to 'waiting_for_parts' if any of
//   its required parts are not yet 'in_stock' or 'received'.
//
// `record_withdrawal` inserts into part_withdrawals; the DB trigger
// fn_deduct_part_on_withdrawal handles the actual quantity deduction.
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
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' })

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

  const { data: caller, error: callerErr } = await admin
    .from('employees')
    .select('role')
    .eq('employee_number', employee_number)
    .maybeSingle()

  if (callerErr) return json(500, { ok: false, error: 'lookup_failed', detail: callerErr.message })
  if (!caller)   return json(403, { ok: false, error: 'unknown_employee' })

  switch (action) {
    case 'add_required_part':
      return await addRequiredPart(params, employee_number)
    case 'update_required_part_status':
      if (caller.role !== 'warehouse' && caller.role !== 'manager') {
        return json(403, { ok: false, error: 'requires_warehouse_or_manager' })
      }
      return await updateRequiredPartStatus(params)
    case 'record_withdrawal':
      if (caller.role !== 'warehouse' && caller.role !== 'manager') {
        return json(403, { ok: false, error: 'requires_warehouse_or_manager' })
      }
      return await recordWithdrawal(params, employee_number)
    default:
      return json(400, { ok: false, error: 'unknown_action', action })
  }
})

// ---------------------------------------------------------------------
// add_required_part — declared by any role. Inventory NOT deducted here.
// ---------------------------------------------------------------------
async function addRequiredPart(params: any, requested_by: number): Promise<Response> {
  const { call_id, part_sku, quantity } = params ?? {}
  if (typeof call_id !== 'string' || typeof part_sku !== 'string' || typeof quantity !== 'number' || quantity <= 0) {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  // Inspect current stock to decide initial status.
  const { data: part, error: partErr } = await admin
    .from('parts')
    .select('quantity')
    .eq('sku', part_sku)
    .maybeSingle()
  if (partErr) return json(500, { ok: false, error: 'part_lookup_failed', detail: partErr.message })
  if (!part)   return json(400, { ok: false, error: 'unknown_part_sku' })

  const initialStatus = part.quantity >= quantity ? 'in_stock' : 'awaiting_order'

  const { data: inserted, error: insertErr } = await admin
    .from('call_required_parts')
    .insert({
      call_id,
      part_sku,
      quantity,
      status: initialStatus,
      requested_by,
    })
    .select('id, status, quantity, part_sku')
    .single()

  if (insertErr) return json(500, { ok: false, error: 'insert_failed', detail: insertErr.message })

  // If anything is awaiting_order, mark the call as waiting_for_parts.
  if (initialStatus === 'awaiting_order') {
    await admin
      .from('service_calls')
      .update({ status: 'waiting_for_parts' })
      .eq('id', call_id)
      .in('status', ['in_treatment'])  // only escalate from in_treatment
  }

  return json(200, { ok: true, required_part: inserted })
}

// ---------------------------------------------------------------------
// update_required_part_status — warehouse advances pipeline
// ---------------------------------------------------------------------
async function updateRequiredPartStatus(params: any): Promise<Response> {
  const { required_part_id, status } = params ?? {}
  const allowed = ['in_stock', 'awaiting_order', 'awaiting_receipt', 'received']
  if (typeof required_part_id !== 'string' || !allowed.includes(status)) {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  const { data, error } = await admin
    .from('call_required_parts')
    .update({ status })
    .eq('id', required_part_id)
    .select('id, call_id, status')
    .single()
  if (error) return json(500, { ok: false, error: 'update_failed', detail: error.message })

  // Recompute call status: if no required parts are still awaiting_*, move call back to in_treatment.
  const { data: pending } = await admin
    .from('call_required_parts')
    .select('id')
    .eq('call_id', data.call_id)
    .in('status', ['awaiting_order', 'awaiting_receipt'])

  if (!pending || pending.length === 0) {
    await admin
      .from('service_calls')
      .update({ status: 'in_treatment' })
      .eq('id', data.call_id)
      .eq('status', 'waiting_for_parts')
  }

  return json(200, { ok: true, required_part: data })
}

// ---------------------------------------------------------------------
// record_withdrawal — physical handover; DB trigger deducts inventory
// ---------------------------------------------------------------------
async function recordWithdrawal(params: any, released_by: number): Promise<Response> {
  const { call_id, part_sku, quantity, withdrawn_by } = params ?? {}
  if (
    typeof call_id !== 'string' ||
    typeof part_sku !== 'string' ||
    typeof quantity !== 'number' || quantity <= 0 ||
    typeof withdrawn_by !== 'number'
  ) {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  // Sanity: enough on hand?
  const { data: part } = await admin
    .from('parts')
    .select('quantity')
    .eq('sku', part_sku)
    .maybeSingle()
  if (!part) return json(400, { ok: false, error: 'unknown_part_sku' })
  if (part.quantity < quantity) {
    return json(400, { ok: false, error: 'insufficient_stock', available: part.quantity })
  }

  const { data, error } = await admin
    .from('part_withdrawals')
    .insert({ call_id, part_sku, quantity, withdrawn_by, released_by })
    .select('id, withdrawn_at, quantity')
    .single()
  if (error) return json(500, { ok: false, error: 'insert_failed', detail: error.message })

  return json(200, { ok: true, withdrawal: data })
}

// ---------------------------------------------------------------------

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}
