import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CallRequiredPart } from '../types/parts'

interface PartLocation {
  warehouse:      string | null
  cabinet:        number | null
  storage_type:   string | null
  storage_number: number | null
  cell_number:    number | null
}

export interface PendingPart extends CallRequiredPart {
  awaiting_receipt_since: string | null
  service_calls?: { display_id: string; vehicle_number: string | null } | null
  warehouse_orders?: { display_id: string } | null
  parts?: { name: string; sku: string; quantity: number; is_sku_blocked?: boolean; replacement_sku?: string | null; hide_from_blocked_table?: boolean; is_exchange?: boolean } | null
  /** Embedded withdrawal (1:1 via required_part_id). Useful only for
   *  the 'delivered' variant where the table needs location + date. */
  part_withdrawals?: Array<{
    id:           string
    withdrawn_at: string
    is_external:  boolean
    parts:        PartLocation | null
  }> | null
}

/**
 * All required parts the warehouse cares about: in-flight, rejected,
 * blocked-via-parent and delivered. The component splits by status.
 */
export function usePendingActions() {
  return useQuery({
    queryKey: ['pending_parts_actions'],
    queryFn: async (): Promise<PendingPart[]> => {
      const { data, error } = await supabase
        .from('call_required_parts')
        .select(`
          *,
          parts(name, quantity, sku, is_sku_blocked, replacement_sku, hide_from_blocked_table, is_exchange),
          service_calls(display_id, vehicle_number),
          warehouse_orders(display_id),
          part_withdrawals(
            id, withdrawn_at, is_external,
            parts(warehouse, cabinet, storage_type, storage_number, cell_number)
          )
        `)
        .neq('status', 'in_stock')
        .order('requested_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as PendingPart[]
    },
  })
}
