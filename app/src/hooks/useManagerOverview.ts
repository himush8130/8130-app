import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface ManagerOverview {
  openCalls: number
  urgentAnomalies: number
  lowStockParts: number
}

export function useManagerOverview() {
  return useQuery({
    queryKey: ['manager_overview'],
    queryFn: async (): Promise<ManagerOverview> => {
      const [openCallsRes, anomaliesRes, partsRes] = await Promise.all([
        supabase
          .from('service_calls')
          .select('id', { count: 'exact', head: true })
          .in('status', ['in_treatment', 'waiting_for_parts']),
        supabase
          .from('service_calls')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new'),
        supabase
          .from('parts')
          .select('sku, quantity, min_threshold')
          .order('sku'),
      ])

      // Strict criterion — only count parts that have actually fallen
      // below their threshold (equality is "at the limit", not below).
      const lowStock = (partsRes.data ?? []).filter(
        (p) => p.quantity < p.min_threshold,
      ).length

      return {
        openCalls:       openCallsRes.count ?? 0,
        urgentAnomalies: anomaliesRes.count ?? 0,
        lowStockParts:   lowStock,
      }
    },
  })
}
