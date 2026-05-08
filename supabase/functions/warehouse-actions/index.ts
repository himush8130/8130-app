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
//   - add_required_part:           {call_id, part_id, quantity}                                   (any role)
//   - update_required_part_status: {required_part_id, status}                                     (warehouse)
//   - record_withdrawal:           {call_id, part_id, quantity, withdrawn_by, [required_part_id]} (warehouse)
//   - update_part:                 {part_id, updates: {field: value, ...}}                        (warehouse)
//   - update_part_quantity:        {part_id, delta} or {part_id, quantity}                        (warehouse)
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
    .select('permissions')
    .eq('employee_number', employee_number)
    .maybeSingle()

  if (callerErr) return json(500, { ok: false, error: 'lookup_failed', detail: callerErr.message })
  if (!caller)   return json(403, { ok: false, error: 'unknown_employee' })

  switch (action) {
    case 'add_required_part':
      return await addRequiredPart(params, employee_number)
    case 'create_part':
      return await createPart(params)
    case 'delete_required_part':
      return await deleteRequiredPart(params)
    case 'update_required_part_status':
      if (caller.permissions !== 'warehouse' && caller.permissions !== 'manager') {
        return json(403, { ok: false, error: 'requires_warehouse_or_manager' })
      }
      return await updateRequiredPartStatus(params)
    case 'record_withdrawal':
      if (caller.permissions !== 'warehouse' && caller.permissions !== 'manager') {
        return json(403, { ok: false, error: 'requires_warehouse_or_manager' })
      }
      return await recordWithdrawal(params, employee_number)
    case 'update_part':
      if (caller.permissions !== 'warehouse' && caller.permissions !== 'manager') {
        return json(403, { ok: false, error: 'requires_warehouse_or_manager' })
      }
      return await updatePart(params)
    case 'update_part_quantity':
      if (caller.permissions !== 'warehouse' && caller.permissions !== 'manager') {
        return json(403, { ok: false, error: 'requires_warehouse_or_manager' })
      }
      return await updatePartQuantity(params)
    default:
      return json(400, { ok: false, error: 'unknown_action', action })
  }
})

// ---------------------------------------------------------------------
// add_required_part — declared by any role. Inventory NOT deducted here.
// Splits into in_stock + awaiting_order rows when demand exceeds the
// "available" pool. Available = parts.quantity minus sum of existing
// in_stock + received required-part rows for the same SKU across all
// calls (i.e. parts already promised but not yet withdrawn).
// ---------------------------------------------------------------------
async function addRequiredPart(params: any, requested_by: number): Promise<Response> {
  const { call_id, part_id, quantity } = params ?? {}
  if (typeof call_id !== 'string' || typeof part_id !== 'string' || typeof quantity !== 'number' || quantity <= 0) {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  // Per user direction: a technician request always lands as
  // 'awaiting_order'. Stock allocation / force-order logic was
  // removed — only the warehouse can transition the row from there.
  const { data: inserted, error: insertErr } = await admin
    .from('call_required_parts')
    .insert([{ call_id, part_id, quantity, status: 'awaiting_order', requested_by }])
    .select('id, status, quantity, part_id')
  if (insertErr) return json(500, { ok: false, error: 'insert_failed', detail: insertErr.message })

  // Escalate the call to waiting_for_parts.
  await admin
    .from('service_calls')
    .update({ status: 'waiting_for_parts' })
    .eq('id', call_id)
    .in('status', ['in_treatment'])

  return json(200, { ok: true, required_parts: inserted })
}

// ---------------------------------------------------------------------
// update_required_part_status — warehouse advances pipeline
// On transition awaiting_receipt -> received we ALSO increment
// parts.quantity by the row's quantity, since "received" means the
// goods physically arrived at the warehouse and are now in stock.
// ---------------------------------------------------------------------
async function updateRequiredPartStatus(params: any): Promise<Response> {
  const { required_part_id, status } = params ?? {}
  const reason: string | null = typeof params?.reason === 'string' ? params.reason.trim() : null
  const allowed = [
    'in_stock', 'awaiting_order', 'awaiting_receipt', 'received',
    'rejected', 'pending_special_approval', 'rejected_final',
  ]
  if (typeof required_part_id !== 'string' || !allowed.includes(status)) {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  // Read the existing row first so we can detect the transition.
  const { data: before, error: beforeErr } = await admin
    .from('call_required_parts')
    .select('id, call_id, part_id, quantity, status, rejection_reason')
    .eq('id', required_part_id)
    .maybeSingle()
  if (beforeErr) return json(500, { ok: false, error: 'lookup_failed', detail: beforeErr.message })
  if (!before)   return json(404, { ok: false, error: 'not_found' })

  // Build the update patch.
  const patch: Record<string, unknown> = { status }
  // Rejection reason: optional. Carries across rejected→pending_special_approval/rejected_final.
  // Cleared when leaving the rejected family.
  const REJECTED = ['rejected', 'pending_special_approval', 'rejected_final']
  if (REJECTED.includes(status)) {
    if (reason !== null) patch.rejection_reason = reason || null
    // else: leave existing reason as-is (preserves on transitions inside the family).
  } else {
    patch.rejection_reason = null
  }

  const { data, error } = await admin
    .from('call_required_parts')
    .update(patch)
    .eq('id', required_part_id)
    .select('id, call_id, part_id, quantity, status, rejection_reason')
    .single()
  if (error) return json(500, { ok: false, error: 'update_failed', detail: error.message })

  // Inventory + withdrawal handling for transitions involving 'received'/'delivered':
  const EXTERNAL_WAREHOUSE = 'מלאי חיצוני'

  /** Pick (or auto-create) a destination part row, then bump its quantity. */
  async function applyReceiveDestination(qty: number): Promise<string | null> {
    const receiveTo = params?.receive_to as string | undefined

    if (receiveTo === 'external') {
      // External is now a real catalog row keyed by sku + warehouse='מלאי חיצוני'.
      // If it exists, bump it. If not, clone from the original and create.
      const { data: orig } = await admin
        .from('parts').select('sku, name, supplier').eq('id', before.part_id).maybeSingle()
      if (!orig?.sku) return 'sku_lookup_failed'
      const { data: existing } = await admin
        .from('parts')
        .select('id, quantity')
        .eq('sku', orig.sku)
        .eq('warehouse', EXTERNAL_WAREHOUSE)
        .limit(1)
        .maybeSingle()
      if (existing) {
        await admin.from('parts').update({ quantity: (existing.quantity ?? 0) + qty }).eq('id', existing.id)
      } else {
        const { error: insErr } = await admin.from('parts').insert({
          sku: orig.sku, name: orig.name ?? '', supplier: orig.supplier ?? null,
          quantity: qty, warehouse: EXTERNAL_WAREHOUSE,
        })
        if (insErr) return insErr.message
      }
      return null
    }

    if (receiveTo === 'new') {
      const loc = params?.receive_new_location ?? {}
      const { data: orig } = await admin
        .from('parts').select('sku, name, supplier').eq('id', before.part_id).maybeSingle()
      const newRow: Record<string, unknown> = {
        sku:            orig?.sku ?? '',
        name:           orig?.name ?? '',
        supplier:       orig?.supplier ?? null,
        quantity:       qty,
        warehouse:      typeof loc.warehouse      === 'string' ? loc.warehouse.trim()       || null : null,
        cabinet:        typeof loc.cabinet        === 'number' ? loc.cabinet                : null,
        storage_type:   typeof loc.storage_type   === 'string' ? loc.storage_type.trim()    || null : null,
        storage_number: typeof loc.storage_number === 'number' ? loc.storage_number         : null,
        cell_number:    typeof loc.cell_number    === 'number' ? loc.cell_number            : null,
      }
      const { error: insErr } = await admin.from('parts').insert(newRow)
      if (insErr) return insErr.message
      return null
    }

    // 'existing' or default — bump the chosen catalog row.
    const targetId = (receiveTo === 'existing' && typeof params?.receive_part_id === 'string')
      ? params.receive_part_id
      : before.part_id
    const { data: stockRow } = await admin
      .from('parts').select('quantity').eq('id', targetId).maybeSingle()
    await admin.from('parts').update({ quantity: (stockRow?.quantity ?? 0) + qty }).eq('id', targetId)
    return null
  }

  if (status === 'received' && before.status !== 'received' && before.status !== 'in_stock') {
    if (before.status === 'delivered') {
      // Coming back from delivered with a destination: drop the withdrawal
      // record (don't auto-refund the source — the user already told us
      // where the goods are now), and apply the destination.
      const { data: wd } = await admin
        .from('part_withdrawals')
        .select('id')
        .eq('required_part_id', required_part_id)
        .maybeSingle()
      if (wd) await admin.from('part_withdrawals').delete().eq('id', wd.id)
    }
    const err = await applyReceiveDestination(before.quantity)
    if (err) return json(500, { ok: false, error: 'receive_failed', detail: err })
  } else if (before.status === 'received' && status === 'awaiting_receipt') {
    // Reverse correction.
    const { data: stockRow } = await admin
      .from('parts').select('quantity').eq('id', before.part_id).maybeSingle()
    await admin.from('parts').update({ quantity: Math.max(0, (stockRow?.quantity ?? 0) - before.quantity) })
      .eq('id', before.part_id)
  } else if (before.status === 'delivered' && status !== 'delivered' && status !== 'received') {
    // Revert from delivered (without specifying a new destination):
    // refund the withdrawal source, delete the withdrawal row.
    const { data: wd } = await admin
      .from('part_withdrawals')
      .select('id, quantity, part_id, is_external')
      .eq('required_part_id', required_part_id)
      .maybeSingle()
    if (wd) {
      if (!wd.is_external) {
        const { data: stockRow } = await admin
          .from('parts').select('quantity').eq('id', wd.part_id).maybeSingle()
        await admin.from('parts').update({ quantity: (stockRow?.quantity ?? 0) + (wd.quantity ?? 0) })
          .eq('id', wd.part_id)
      }
      await admin.from('part_withdrawals').delete().eq('id', wd.id)
    }
  }

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
// Optional required_part_id links the withdrawal to a specific
// required-part row, marking it as 'delivered' so it disappears from
// pending queues.
// ---------------------------------------------------------------------
async function recordWithdrawal(params: any, released_by: number): Promise<Response> {
  const { call_id, part_id, quantity, withdrawn_by, required_part_id } = params ?? {}
  const is_external = !!params?.is_external
  if (
    typeof call_id !== 'string' ||
    typeof part_id !== 'string' ||
    typeof quantity !== 'number' || quantity <= 0 ||
    typeof withdrawn_by !== 'number'
  ) {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  // Internal stock check — skipped for external dispenses.
  if (!is_external) {
    const { data: part } = await admin
      .from('parts')
      .select('quantity')
      .eq('id', part_id)
      .maybeSingle()
    if (!part) return json(400, { ok: false, error: 'unknown_part' })
    if (part.quantity < quantity) {
      return json(400, { ok: false, error: 'insufficient_stock', available: part.quantity })
    }
  }

  const { data, error } = await admin
    .from('part_withdrawals')
    .insert({
      call_id, part_id, quantity, withdrawn_by, released_by,
      is_external,
      required_part_id: typeof required_part_id === 'string' ? required_part_id : null,
    })
    .select('id, withdrawn_at, quantity, is_external')
    .single()
  if (error) return json(500, { ok: false, error: 'insert_failed', detail: error.message })

  if (typeof required_part_id === 'string') {
    await admin
      .from('call_required_parts')
      .update({ status: 'delivered' })
      .eq('id', required_part_id)
  }

  return json(200, { ok: true, withdrawal: data })
}

// ---------------------------------------------------------------------
// update_part — warehouse edits arbitrary fields of a parts row.
// ---------------------------------------------------------------------
const ALLOWED_PART_FIELDS = new Set([
  'name', 'sku', 'quantity', 'min_threshold',
  'warehouse', 'cabinet', 'storage_type', 'storage_number', 'cell_number',
  'is_exchange', 'supplier', 'location', 'stock_count', 'is_sku_blocked',
])

async function createPart(params: any): Promise<Response> {
  const sku   = typeof params?.sku   === 'string' ? params.sku.trim()   : ''
  const name  = typeof params?.name  === 'string' ? params.name.trim()  : ''
  if (!sku || !name) return json(400, { ok: false, error: 'invalid_params' })

  const row: Record<string, unknown> = {
    sku,
    name,
    quantity:      typeof params?.quantity      === 'number' ? params.quantity      : 0,
    min_threshold: typeof params?.min_threshold === 'number' ? params.min_threshold : 0,
    location:      typeof params?.location      === 'string' ? params.location      : null,
    supplier:      typeof params?.supplier      === 'string' ? params.supplier      : null,
  }

  const { data, error } = await admin
    .from('parts')
    .insert(row)
    .select('*')
    .single()
  if (error) return json(500, { ok: false, error: 'insert_failed', detail: error.message })
  return json(200, { ok: true, part: data })
}

async function deleteRequiredPart(params: any): Promise<Response> {
  const { required_part_id } = params ?? {}
  if (typeof required_part_id !== 'string') {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  // Capture the call_id BEFORE we delete so we can recompute its status.
  const { data: before } = await admin
    .from('call_required_parts')
    .select('call_id')
    .eq('id', required_part_id)
    .maybeSingle()

  const { error } = await admin
    .from('call_required_parts')
    .delete()
    .eq('id', required_part_id)
  if (error) return json(500, { ok: false, error: 'delete_failed', detail: error.message })

  // If the call has no more awaiting_* required parts, lift it out of
  // waiting_for_parts. Mirrors the recompute in updateRequiredPartStatus.
  if (before?.call_id) {
    const { data: pending } = await admin
      .from('call_required_parts')
      .select('id')
      .eq('call_id', before.call_id)
      .in('status', ['awaiting_order', 'awaiting_receipt'])

    if (!pending || pending.length === 0) {
      await admin
        .from('service_calls')
        .update({ status: 'in_treatment' })
        .eq('id', before.call_id)
        .eq('status', 'waiting_for_parts')
    }
  }

  return json(200, { ok: true })
}

async function updatePart(params: any): Promise<Response> {
  const { part_id, updates } = params ?? {}
  if (typeof part_id !== 'string' || !updates || typeof updates !== 'object') {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(updates)) {
    if (!ALLOWED_PART_FIELDS.has(k)) continue
    patch[k] = v
  }
  if (Object.keys(patch).length === 0) {
    return json(400, { ok: false, error: 'no_valid_fields' })
  }

  // Numeric guards.
  if (typeof patch.quantity === 'number' && patch.quantity < 0) {
    return json(400, { ok: false, error: 'quantity_negative' })
  }
  if (typeof patch.min_threshold === 'number' && patch.min_threshold < 0) {
    return json(400, { ok: false, error: 'min_threshold_negative' })
  }

  const { data, error } = await admin
    .from('parts')
    .update(patch)
    .eq('id', part_id)
    .select('*')
    .single()
  if (error) return json(500, { ok: false, error: 'update_failed', detail: error.message })
  return json(200, { ok: true, part: data })
}

// ---------------------------------------------------------------------
// update_part_quantity — convenience for ±1 buttons / quick edit.
// Either pass an absolute `quantity` or a relative `delta`.
// ---------------------------------------------------------------------
async function updatePartQuantity(params: any): Promise<Response> {
  const { part_id, quantity, delta } = params ?? {}
  if (typeof part_id !== 'string') {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  let next: number | null = null
  if (typeof quantity === 'number') {
    if (quantity < 0) return json(400, { ok: false, error: 'quantity_negative' })
    next = Math.floor(quantity)
  } else if (typeof delta === 'number') {
    const { data: cur } = await admin
      .from('parts')
      .select('quantity')
      .eq('id', part_id)
      .maybeSingle()
    if (!cur) return json(404, { ok: false, error: 'not_found' })
    next = Math.max(0, cur.quantity + Math.floor(delta))
  } else {
    return json(400, { ok: false, error: 'missing_quantity_or_delta' })
  }

  const { data, error } = await admin
    .from('parts')
    .update({ quantity: next })
    .eq('id', part_id)
    .select('id, quantity')
    .single()
  if (error) return json(500, { ok: false, error: 'update_failed', detail: error.message })
  return json(200, { ok: true, part: data })
}

// ---------------------------------------------------------------------

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}
