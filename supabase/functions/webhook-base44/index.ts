// =====================================================================
// 8130 APP — Webhook receiver for Base44 form submissions
// =====================================================================
// Edge Function endpoint that receives service-call form submissions
// from the Base44 platform via HTTP POST.
//
// IMPORTANT: This server NEVER rejects a request based on content.
// Per project principle, all forms are accepted. Anomalies are flagged
// in the DB and surfaced to managers, not bounced back to the caller.
//
// Authentication: Bearer token in `Authorization` header.
// Authentication failure is the ONLY case that returns a 4xx response.
// =====================================================================

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck — Deno globals not available in this TS project; runs in Supabase Edge Runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')!

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // --- Auth: the only thing that can reject a request ---
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (token !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  // --- Parse body, but accept anything (even malformed) ---
  let payload: any = {}
  try {
    payload = await req.json()
  } catch {
    payload = { _raw_parse_error: true }
  }

  // --- TODO (db-engineer): insert into service_calls table ---
  // For M1 the schema does not yet exist; this is a skeleton.
  // The eventual logic:
  //   1. Insert raw form into service_calls (all fields optional)
  //   2. Look up vehicle_number → vehicle.type → profession
  //   3. Pick available technician via rotation
  //   4. Set status = 'in_treatment' on success, or flag anomaly
  //
  // Until the schema exists, just log and return 200.

  console.log('Received form:', JSON.stringify(payload))

  return new Response(
    JSON.stringify({ ok: true, received: true }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
})
