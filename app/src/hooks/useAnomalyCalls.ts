import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ServiceCall, Profession } from '../types/db'

export interface AnomalyData {
  calls: ServiceCall[]
  professions: Profession[]
}

export function useAnomalyCalls() {
  return useQuery({
    queryKey: ['anomaly_calls'],
    queryFn: async (): Promise<AnomalyData> => {
      const [callsRes, profsRes] = await Promise.all([
        supabase
          .from('service_calls')
          .select('*')
          .eq('status', 'new')
          .order('created_at', { ascending: false }),
        supabase
          .from('professions')
          .select('*')
          .order('id'),
      ])
      if (callsRes.error) throw callsRes.error
      if (profsRes.error) throw profsRes.error
      return {
        calls:       (callsRes.data ?? []) as ServiceCall[],
        professions: (profsRes.data ?? []) as Profession[],
      }
    },
  })
}
