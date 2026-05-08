import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CallRequiredPart } from '../types/parts'

interface PendingPart extends CallRequiredPart {
  /** display_id + vehicle_number of the parent call. */
  service_calls?: { display_id: string; vehicle_number: string | null } | null
  /** Embedded — needed for the per-row "שנה סטטוס" menu. */
  parts?: { name: string; sku: string; quantity: number; is_sku_blocked?: boolean } | null
}

/**
 * All ACTIVE required parts (anything not yet delivered).
 * The warehouse uses this to know what to hand out, what to order,
 * and what's en route.
 */
export function usePendingActions() {
  return useQuery({
    queryKey: ['pending_parts_actions'],
    queryFn: async (): Promise<PendingPart[]> => {
      const { data, error } = await supabase
        .from('call_required_parts')
        .select('*, parts(name, quantity, sku, is_sku_blocked), service_calls(display_id, vehicle_number)')
        .in('status', [
          'in_stock', 'awaiting_order', 'awaiting_receipt', 'received',
          'rejected', 'pending_special_approval', 'rejected_final',
          'delivered',
        ])
        .order('requested_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as PendingPart[]
    },
  })
}
