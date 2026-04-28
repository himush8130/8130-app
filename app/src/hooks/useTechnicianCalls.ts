import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ServiceCall } from '../types/db'

/**
 * Calls visible to a technician of a given profession:
 *  - status is in_treatment OR waiting_for_parts (active)
 *  - profession_id matches
 */
export function useTechnicianCalls(professionId: number | null) {
  return useQuery({
    queryKey: ['service_calls', 'by-profession', professionId],
    enabled: professionId !== null,
    queryFn: async (): Promise<ServiceCall[]> => {
      const { data, error } = await supabase
        .from('service_calls')
        .select('*')
        .eq('profession_id', professionId!)
        .in('status', ['in_treatment', 'waiting_for_parts'])
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ServiceCall[]
    },
  })
}
