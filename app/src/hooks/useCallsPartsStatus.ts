import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { RequiredPartStatus } from '../types/db'

// Worst-status priority. Higher = blocks the call more.
const PRIORITY: Record<RequiredPartStatus, number> = {
  rejected:                 8,  // most blocking — needs human attention
  pending_special_approval: 7,
  awaiting_order:           5,
  awaiting_receipt:         4,
  received:                 3,
  in_stock:                 2,
  rejected_final:           1,  // archived end-state
  delivered:                1,
}

/**
 * Returns a map call_id → worst RequiredPartStatus across all required
 * parts for that call. Calls without any required parts are absent
 * from the map (consumers treat that as "no parts indicator").
 */
export function useCallsPartsStatus() {
  return useQuery({
    queryKey: ['calls_parts_status'],
    queryFn: async (): Promise<Map<string, RequiredPartStatus>> => {
      const { data, error } = await supabase
        .from('call_required_parts')
        .select('call_id, status')
      if (error) throw error

      const map = new Map<string, RequiredPartStatus>()
      for (const row of (data ?? []) as Array<{ call_id: string; status: RequiredPartStatus }>) {
        const current = map.get(row.call_id)
        if (!current || PRIORITY[row.status] > PRIORITY[current]) {
          map.set(row.call_id, row.status)
        }
      }
      return map
    },
  })
}
