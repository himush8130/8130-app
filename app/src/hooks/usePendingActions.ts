import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CallRequiredPart } from '../types/parts'

interface PendingPart extends CallRequiredPart {
  /** display_id of the parent call, embedded via FK */
  service_calls?: { display_id: string } | null
}

/**
 * Required parts in awaiting_order or awaiting_receipt status.
 * Shown to the warehouse so they know what to procure.
 */
export function usePendingActions() {
  return useQuery({
    queryKey: ['pending_parts_actions'],
    queryFn: async (): Promise<PendingPart[]> => {
      const { data, error } = await supabase
        .from('call_required_parts')
        .select('*, parts(name, quantity), service_calls(display_id)')
        .in('status', ['awaiting_order', 'awaiting_receipt'])
        .order('requested_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as PendingPart[]
    },
  })
}
