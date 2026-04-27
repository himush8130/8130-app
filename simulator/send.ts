// =====================================================================
// 8130 APP — Base44 form simulator
// =====================================================================
// Sends a JSON form payload to the project's webhook endpoint, exactly
// as Base44 would. Used during development to test the intake flow
// before Base44 implements their side.
//
// Usage:
//   npx tsx send.ts --template basic.json
//   npx tsx send.ts --random
//   npx tsx send.ts --template basic.json --target https://my-edge-fn-url
//
// Env vars (loaded from ../.env.local):
//   WEBHOOK_TARGET_URL  — defaults to local edge fn or override per-call
//   WEBHOOK_SECRET      — Bearer token sent in Authorization header
// =====================================================================

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = join(__dirname, 'templates')

// --- Tiny .env.local loader (no deps) ---
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>
  try {
    const raw = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim()
      if (!env[key]) env[key] = val
    }
  } catch {
    // .env.local not present — rely on process.env
  }
  return env
}

// --- CLI args ---
function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {}
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        args[key] = next
        i++
      } else {
        args[key] = true
      }
    }
  }
  return args
}

function pickTemplate(args: Record<string, string | boolean>): string {
  const all = readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.json'))
  if (all.length === 0) {
    throw new Error(`No templates found in ${TEMPLATES_DIR}`)
  }
  if (args.random) {
    return all[Math.floor(Math.random() * all.length)]
  }
  if (typeof args.template === 'string') {
    const wanted = args.template.endsWith('.json') ? args.template : `${args.template}.json`
    if (!all.includes(wanted)) {
      throw new Error(`Template not found: ${wanted}\nAvailable: ${all.join(', ')}`)
    }
    return wanted
  }
  throw new Error('Provide --template <name> or --random')
}

async function main() {
  const env = loadEnv()
  const args = parseArgs(process.argv)

  const target =
    (typeof args.target === 'string' && args.target) ||
    env.WEBHOOK_TARGET_URL ||
    'http://localhost:54321/functions/v1/webhook-base44'

  const secret = env.WEBHOOK_SECRET
  if (!secret) {
    console.error('⚠ WEBHOOK_SECRET not set in .env.local — sending without Bearer (will get 401 from real endpoint)')
  }

  const templateName = pickTemplate(args)
  const raw = readFileSync(join(TEMPLATES_DIR, templateName), 'utf8')
  const payload = JSON.parse(raw)
  payload.external_id = randomUUID()

  console.log(`→ POST ${target}`)
  console.log(`  template: ${templateName}`)
  console.log(`  external_id: ${payload.external_id}`)

  const res = await fetch(target, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(secret ? { authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const body = await res.text()
  console.log(`← ${res.status} ${res.statusText}`)
  console.log(`  ${body}`)
  process.exit(res.ok ? 0 : 1)
}

main().catch((err) => {
  console.error('✗ Simulator failed:', err.message)
  process.exit(1)
})
