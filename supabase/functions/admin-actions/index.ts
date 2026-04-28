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
    .select('role')
    .eq('employee_number', employee_number)
    .maybeSingle()

  if (!caller) return json(403, { ok: false, error: 'unknown_employee' })
  if (caller.role !== 'manager') return json(403, { ok: false, error: 'requires_manager' })

  switch (action) {
    case 'create_profession': return await createProfession(params)
    case 'update_profession': return await updateProfession(params)
    case 'delete_profession': return await deleteProfession(params)
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
  const name = typeof params?.name === 'string' ? params.name.trim() : ''
  if (typeof id !== 'number' || !name) {
    return json(400, { ok: false, error: 'invalid_params' })
  }

  const { data, error } = await admin
    .from('professions')
    .update({ name })
    .eq('id', id)
    .select('id, name')
    .single()

  if (error) {
    if (error.code === '23505') return json(409, { ok: false, error: 'name_taken' })
    return json(500, { ok: false, error: 'update_failed', detail: error.message })
  }
  return json(200, { ok: true, profession: data })
}

async function deleteProfession(params: any): Promise<Response> {
  const id = params?.id
  if (typeof id !== 'number') return json(400, { ok: false, error: 'invalid_params' })

  // Block if anything still references this profession.
  const [vRes, eRes] = await Promise.all([
    admin.from('vehicles')  .select('vehicle_number', { count: 'exact', head: true }).eq('type_id', id),
    admin.from('employees') .select('employee_number', { count: 'exact', head: true }).eq('profession_id', id),
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

// ----- helpers -----

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}
