// =====================================================================
// 8130 APP — Webhook receiver for Base44 form submissions
// =====================================================================
// Receives a service-call form payload from the Base44 platform via
// HTTP POST, persists it to the `service_calls` table, and runs the
// auto-classification algorithm.
//
// PROJECT PRINCIPLE: This server NEVER rejects a request based on
// content. The ONLY 4xx response is 401 for an invalid Bearer token.
// All other input — even malformed JSON — yields a 200 and a stored
// row, with anomalies surfaced via `anomaly_flags`.
//
// Auto-classification (per docs/SPEC.md §5):
//   1. Look up vehicle_number → profession_name (from vehicles.type_name).
//   2. If found AND at least one technician of that profession is
//      available today → status='in_treatment'.
//   3. If vehicle unknown OR no available technician → status='new'
//      (urgent anomaly for the manager queue).
// =====================================================================

// @ts-nocheck — Deno runtime; types not available in this TS project

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')!

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

type Anomaly = { code: string; detail?: string }

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // -------- Auth: the only thing that can reject a request --------
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  // -------- Parse body — accept anything --------
  let payload: Record<string, unknown> = {}
  let parseError = false
  try {
    payload = await req.json()
  } catch {
    parseError = true
  }

  const anomalies: Anomaly[] = []
  if (parseError) anomalies.push({ code: 'malformed_json' })

  const vehicle_number = strOrNull(payload.vehicle_number)
  const vehicle_name   = strOrNull(payload.vehicle_name)
  const reporter_name  = strOrNull(payload.reporter_name)
  const reporter_phone = strOrNull(payload.reporter_phone)
  const description    = strOrNull(payload.description)
  const external_id    = strOrNull(payload.external_id)

  // -------- Soft anomalies (call still proceeds) --------
  if (!vehicle_number) anomalies.push({ code: 'missing_vehicle_number' })
  if (!reporter_name)  anomalies.push({ code: 'missing_reporter_name' })
  if (!reporter_phone) anomalies.push({ code: 'missing_reporter_phone' })
  if (!description)    anomalies.push({ code: 'missing_description' })

  // -------- Auto-classification --------
  let profession_name: string | null = null
  let status: 'new' | 'in_treatment' = 'new'

  if (vehicle_number) {
    const { data: vehicle } = await admin
      .from('vehicles')
      .select('type_name')
      .eq('vehicle_number', vehicle_number)
      .maybeSingle()

    if (!vehicle) {
      anomalies.push({ code: 'unknown_vehicle', detail: vehicle_number })
    } else {
      profession_name = vehicle.type_name

      const today = new Date().toISOString().slice(0, 10)
      const { data: techs } = await admin
        .from('employees')
        .select('employee_number')
        .eq('profession_name', profession_name)
        .eq('permissions', 'technician')

      if (!techs || techs.length === 0) {
        anomalies.push({ code: 'no_technicians_for_profession' })
      } else {
        const techNums = techs.map((t) => t.employee_number)
        const { data: unavailable } = await admin
          .from('employee_availability')
          .select('employee_number')
          .in('employee_number', techNums)
          .eq('date', today)

        const unavailableSet = new Set((unavailable ?? []).map((u) => u.employee_number))
        const someoneAvailable = techNums.some((n) => !unavailableSet.has(n))

        if (someoneAvailable) {
          status = 'in_treatment'
        } else {
          anomalies.push({ code: 'all_technicians_unavailable_today' })
        }
      }
    }
  }

  // -------- Insert the call (always succeeds) --------
  const { data: inserted, error } = await admin
    .from('service_calls')
    .insert({
      external_id,
      vehicle_name,
      vehicle_number,
      reporter_name,
      reporter_phone,
      description,
      status,
      profession_name,
      anomaly_flags: anomalies,
    })
    .select('id, display_id, status, profession_name')
    .single()

  if (error) {
    // Per principle, still return 200 — but surface the error in the body
    // so the simulator / dev can see what went wrong.
    return jsonResponse(200, {
      ok: false,
      error: 'insert_failed',
      detail: error.message,
      anomalies,
    })
  }

  return jsonResponse(200, {
    ok: true,
    call: inserted,
    anomalies,
  })
})

// ---- helpers ----
function strOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length === 0 ? null : t
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
