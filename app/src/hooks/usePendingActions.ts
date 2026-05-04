import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CallRequiredPart } from '../types/parts'

interface PendingPart extends CallRequiredPart {
  /** display_id of the parent call, embedded via FK */
  service_calls?: { display_id: string } | null
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
        .select('*, parts(name, quantity, sku, original_sku), service_calls(display_id)')
        .in('status', ['in_stock', 'awaiting_order', 'awaiting_receipt', 'received'])
        .order('requested_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as PendingPart[]
    },
  })
}
