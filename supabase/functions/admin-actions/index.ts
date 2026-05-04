// =====================================================================
// 8130 APP — Admin (lookup-table) mutations
// =====================================================================
// Manager-only endpoint for CRUD on the lookup tables.
//
// Currently supports professions; vehicles/employees/availability come
// next under the same dispatch pattern.
//
// Request body:
//   { employee_number: number, action: string, params: {...} }
//
// Actions (all manager-only):
//   - create_profession: { name }
//   - update_profession: { id, name }
//   - delete_profession: { id }      // refuses if FK usage > 0
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

  const { data: caller } = await admin
    .from('employees')
    .select('permissions')
    .eq('employee_number', employee_number)
    .maybeSingle()

  if (!caller) return json(403, { ok: false, error: 'unknown_employee' })
  if (caller.permissions !== 'manager') return json(403, { ok: false, error: 'requires_manager' })

  switch (action) {
    case 'create_profession': return await createProfession(params)
    case 'update_profession': return await updateProfession(params)
    case 'delete_profession': return await deleteProfession(params)

    case 'create_employee':   return await createEmployee(params)
    case 'update_employee':   return await updateEmployee(params)
    case 'delete_employee':   return await deleteEmployee(params)

    case 'create_vehicle':    return await createVehicle(params)
    case 'update_vehicle':    return await updateVehicle(params)
    case 'delete_vehicle':    return await deleteVehicle(params)

    case 'set_availability':  return await setAvailability(params)
    default:
      return json(400, { ok: false, error: 'unknown_action', action })
  }
})

// ----- Profession actions -----

async function createProfession(params: any): Promise<Response> {
  const name = typeof params?.name === 'string' ? params.name.trim() : ''
  if (!name) return json(400, { ok: false, error: 'invalid_name' })

  const { data, error } = await admin
    .from('professions')
    .insert({ name })
    .select('id, name')
    .single()

  if (error) {
    if (error.code === '23505') {
      return json(409, { ok: false, error: 'name_taken' })
    }
    return json(500, { ok: false, error: 'insert_failed', detail: error.message })
  }
  return json(200, { ok: true, profession: data })
}

async function updateProfession(params: any): Promise<Response> {
  const id = params?.id
  const newName = typeof params?.name === 'string' ? params.name.trim() : ''
  if (typeof id !== 'number' || !newName) {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  // Read the current name first so we can propagate the rename to the
  // tables that store profession_name as text (no FK).
  const { data: current, error: curErr } = await admin
    .from('professions')
    .select('name')
    .eq('id', id)
    .maybeSingle()
  if (curErr)   return json(500, { ok: false, error: 'lookup_failed', detail: curErr.message })
  if (!current) return json(404, { ok: false, error: 'not_found' })

  if (current.name === newName) {
    return json(200, { ok: true, profession: { id, name: newName } })
  }

  const { data, error } = await admin
    .from('professions')
    .update({ name: newName })
    .eq('id', id)
    .select('id, name')
    .single()

  if (error) {
    if (error.code === '23505') return json(409, { ok: false, error: 'name_taken' })
    return json(500, { ok: false, error: 'update_failed', detail: error.message })
  }

  // Propagate the rename to denormalized references.
  await Promise.all([
    admin.from('employees')      .update({ profession_name: newName }).eq('profession_name', current.name),
    admin.from('vehicles')       .update({ type_name:        newName }).eq('type_name',        current.name),
    admin.from('service_calls')  .update({ profession_name: newName }).eq('profession_name', current.name),
  ])

  return json(200, { ok: true, profession: data })
}

async function deleteProfession(params: any): Promise<Response> {
  const id = params?.id
  if (typeof id !== 'number') return json(400, { ok: false, error: 'invalid_params' })

  // Look up the name first; usage checks query the denormalized text.
  const { data: prof, error: profErr } = await admin
    .from('professions')
    .select('name')
    .eq('id', id)
    .maybeSingle()
  if (profErr) return json(500, { ok: false, error: 'lookup_failed', detail: profErr.message })
  if (!prof)   return json(404, { ok: false, error: 'not_found' })

  const [vRes, eRes] = await Promise.all([
    admin.from('vehicles')  .select('vehicle_number', { count: 'exact', head: true }).eq('type_name',        prof.name),
    admin.from('employees') .select('employee_number', { count: 'exact', head: true }).eq('profession_name', prof.name),
  ])
  const vehicleCount  = vRes.count ?? 0
  const employeeCount = eRes.count ?? 0
  if (vehicleCount > 0 || employeeCount > 0) {
    return json(409, {
      ok: false,
      error: 'in_use',
      vehicles: vehicleCount,
      employees: employeeCount,
    })
  }

  const { error } = await admin
    .from('professions')
    .delete()
    .eq('id', id)
  if (error) return json(500, { ok: false, error: 'delete_failed', detail: error.message })
  return json(200, { ok: true })
}

// ----- Employee actions -----

const ALLOWED_EMP_FIELDS = new Set([
  'name', 'phone', 'profession_name', 'permissions',
])

async function createEmployee(params: any): Promise<Response> {
  const { employee_number, ...rest } = params ?? {}
  if (typeof employee_number !== 'number' || typeof rest.name !== 'string' || !rest.name.trim()) {
    return json(400, { ok: false, error: 'invalid_params' })
  }
  const row: Record<string, unknown> = { employee_number, name: rest.name.trim() }
  if (typeof rest.phone === 'string')           row.phone           = rest.phone.trim() || null
  if (typeof rest.profession_name === 'string') row.profession_name = rest.profession_name.trim() || null
  if (typeof rest.permissions === 'string')     row.permissions     = rest.permissions

  const { data, error } = await admin
    .from('employees')
    .insert(row)
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505') return json(409, { ok: false, error: 'employee_number_taken' })
    return json(500, { ok: false, error: 'insert_failed', detail: error.message })
  }
  return json(200, { ok: true, employee: data })
}

async function updateEmployee(params: any): Promise<Response> {
  const employee_number = params?.employee_number
  const updates = params?.updates
  if (typeof employee_number !== 'number' || !updates || typeof updates !== 'object') {
    return json(400, { ok: false, error: 'invalid_params' })
  }
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(updates)) {
    if (!ALLOWED_EMP_FIELDS.has(k)) continue
    if (k === 'phone' || k === 'profession_name') {
      const s = (v == null) ? null : String(v).trim()
      patch[k] = s || null
    } else {
      patch[k] = v
    }
  }
  if (Object.keys(patch).length === 0) return json(400, { ok: false, error: 'no_valid_fields' })

  const { data, error } = await admin
    .from('employees')
    .update(patch)
    .eq('employee_number', employee_number)
    .select('*')
    .single()
  if (error) return json(500, { ok: false, error: 'update_failed', detail: error.message })
  return json(200, { ok: true, employee: data })
}

async function deleteEmployee(params: any): Promise<Response> {
  const employee_number = params?.employee_number
  if (typeof employee_number !== 'number') return json(400, { ok: false, error: 'invalid_params' })

  // Block when restrictive FKs would prevent it (feedback_notes, withdrawals).
  const [fbRes, wRes] = await Promise.all([
    admin.from('feedback_notes')   .select('id', { count: 'exact', head: true }).eq('author_employee_number', employee_number),
    admin.from('part_withdrawals') .select('id', { count: 'exact', head: true }).or(`withdrawn_by.eq.${employee_number},released_by.eq.${employee_number}`),
  ])
  const feedbackCount = fbRes.count ?? 0
  const withdrawCount = wRes.count ?? 0
  if (feedbackCount > 0 || withdrawCount > 0) {
    return json(409, {
      ok: false,
      error: 'in_use',
      feedback_notes:   feedbackCount,
      part_withdrawals: withdrawCount,
    })
  }

  const { error } = await admin
    .from('employees')
    .delete()
    .eq('employee_number', employee_number)
  if (error) return json(500, { ok: false, error: 'delete_failed', detail: error.message })
  return json(200, { ok: true })
}

// ----- Vehicle actions -----

const ALLOWED_VEH_FIELDS = new Set([
  'type_name', 'department', 'sub_department',
])

async function createVehicle(params: any): Promise<Response> {
  const { vehicle_number, ...rest } = params ?? {}
  if (typeof vehicle_number !== 'string' || !vehicle_number.trim()) {
    return json(400, { ok: false, error: 'invalid_params' })
  }
  if (typeof rest.type_name !== 'string' || !rest.type_name.trim()) {
    return json(400, { ok: false, error: 'type_name_required' })
  }
  const row: Record<string, unknown> = {
    vehicle_number: vehicle_number.trim(),
    type_name:      rest.type_name.trim(),
  }
  if (typeof rest.department === 'string')     row.department     = rest.department.trim()     || null
  if (typeof rest.sub_department === 'string') row.sub_department = rest.sub_department.trim() || null

  const { data, error } = await admin
    .from('vehicles')
    .insert(row)
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505') return json(409, { ok: false, error: 'vehicle_number_taken' })
    return json(500, { ok: false, error: 'insert_failed', detail: error.message })
  }
  return json(200, { ok: true, vehicle: data })
}

async function updateVehicle(params: any): Promise<Response> {
  const vehicle_number = params?.vehicle_number
  const updates = params?.updates
  if (typeof vehicle_number !== 'string' || !updates || typeof updates !== 'object') {
    return json(400, { ok: false, error: 'invalid_params' })
  }
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(updates)) {
    if (!ALLOWED_VEH_FIELDS.has(k)) continue
    const s = (v == null) ? null : String(v).trim()
    patch[k] = s || null
  }
  if (Object.keys(patch).length === 0) return json(400, { ok: false, error: 'no_valid_fields' })
  // type_name is NOT NULL on the table; reject empty here.
  if ('type_name' in patch && !patch.type_name) {
    return json(400, { ok: false, error: 'type_name_required' })
  }

  const { data, error } = await admin
    .from('vehicles')
    .update(patch)
    .eq('vehicle_number', vehicle_number)
    .select('*')
    .single()
  if (error) return json(500, { ok: false, error: 'update_failed', detail: error.message })
  return json(200, { ok: true, vehicle: data })
}

async function deleteVehicle(params: any): Promise<Response> {
  const vehicle_number = params?.vehicle_number
  if (typeof vehicle_number !== 'string') return json(400, { ok: false, error: 'invalid_params' })

  const { error } = await admin
    .from('vehicles')
    .delete()
    .eq('vehicle_number', vehicle_number)
  if (error) return json(500, { ok: false, error: 'delete_failed', detail: error.message })
  return json(200, { ok: true })
}

// ----- Availability action -----

async function setAvailability(params: any): Promise<Response> {
  const { employee_number, date, available, reason } = params ?? {}
  if (typeof employee_number !== 'number' || typeof date !== 'string' || typeof available !== 'boolean') {
    return json(400, { ok: false, error: 'invalid_params' })
  }
  if (available) {
    const { error } = await admin
      .from('employee_availability')
      .delete()
      .eq('employee_number', employee_number)
      .eq('date', date)
    if (error) return json(500, { ok: false, error: 'delete_failed', detail: error.message })
    return json(200, { ok: true, available: true })
  }
  // Mark as unavailable: upsert.
  const { error } = await admin
    .from('employee_availability')
    .upsert({ employee_number, date, reason: reason ?? null }, { onConflict: 'employee_number,date' })
  if (error) return json(500, { ok: false, error: 'upsert_failed', detail: error.message })
  return json(200, { ok: true, available: false })
}

// ----- helpers -----

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}
