import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { RequiredPartStatus } from '../types/db'

// Worst-status priority. Higher = blocks the call more.
const PRIORITY: Record<RequiredPartStatus, number> = {
  rejected:                 8,
  pending_special_approval: 7,
  awaiting_order:           5,
  awaiting_receipt:         4,
  received:                 3,
  not_consumed:             3,
  in_stock:                 2,
  rejected_final:           1,
  delivered:                1,
}

const WARNING_STATUSES: ReadonlySet<RequiredPartStatus> = new Set([
  'rejected', 'rejected_final',
])

export interface CallPartsSummary {
  /** Highest-priority (most-blocking) status across the call's parts. */
  worst:      RequiredPartStatus
  /** Every required-part on the call shares the same status, AND
   *  none of the parts is sku-blocked (sku-blocked is a "synthetic"
   *  status that always wins). */
  uniform:    boolean
  /** At least one part is rejected / rejected_final / sku-blocked. */
  hasWarning: boolean
}

/**
 * Returns a map call_id → summary across all required parts.
 * Calls without any required parts are absent.
 */
export function useCallsPartsStatus() {
  return useQuery({
    queryKey: ['calls_parts_status'],
    queryFn: async (): Promise<Map<string, CallPartsSummary>> => {
      const { data, error } = await supabase
        .from('call_required_parts')
        .select('call_id, status, parts(is_sku_blocked)')
      if (error) throw error

      const groups = new Map<string, Array<{ status: RequiredPartStatus; blocked: boolean }>>()
      for (const row of (data ?? []) as Array<{
        call_id: string
        status: RequiredPartStatus
        parts: { is_sku_blocked: boolean | null } | { is_sku_blocked: boolean | null }[] | null
      }>) {
        const partRow = Array.isArray(row.parts) ? row.parts[0] : row.parts
        const blocked = !!partRow?.is_sku_blocked
        const arr = groups.get(row.call_id) ?? []
        arr.push({ status: row.status, blocked })
        groups.set(row.call_id, arr)
      }

      const out = new Map<string, CallPartsSummary>()
      for (const [callId, rows] of groups) {
        let worst: RequiredPartStatus = rows[0].status
        let hasWarning = false
        const firstStatus = rows[0].status
        let uniform = true
        for (const r of rows) {
          if (PRIORITY[r.status] > PRIORITY[worst]) worst = r.status
          if (r.blocked || WARNING_STATUSES.has(r.status)) hasWarning = true
          if (r.status !== firstStatus || r.blocked) uniform = false
        }
        out.set(callId, { worst, uniform, hasWarning })
      }
      return out
    },
  })
}
