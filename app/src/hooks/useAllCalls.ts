import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ServiceCall, CallStatus, Profession } from '../types/db'

export interface AllCallsFilters {
  statuses?: CallStatus[]
  professionIds?: number[]
}

export interface AllCallsData {
  calls: ServiceCall[]
  professions: Profession[]
}

export function useAllCalls(filters: AllCallsFilters) {
  return useQuery({
    queryKey: ['all_calls', filters],
    queryFn: async (): Promise<AllCallsData> => {
      let q = supabase.from('service_calls').select('*')
      if (filters.statuses && filters.statuses.length > 0) {
        q = q.in('status', filters.statuses)
      }
      if (filters.professionIds && filters.professionIds.length > 0) {
        q = q.in('profession_id', filters.professionIds)
      }
      q = q.order('created_at', { ascending: false }).limit(200)

      const [callsRes, profsRes] = await Promise.all([
        q,
        supabase.from('professions').select('*').order('id'),
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
