import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface IcSession {
  id: string
  opened_by: number
  opened_at: string
  closed_at: string | null
  status: 'open' | 'closed'
}

export interface IcEntry {
  id: string
  session_id: string
  part_id: string
  counted_qty: number
  expected_qty: number
  counted_by: number
  counted_at: string
}

export function useInventorySession() {
  return useQuery({
    queryKey: ['ic_session'],
    queryFn: async (): Promise<IcSession | null> => {
      const { data, error } = await supabase
        .from('inventory_count_sessions')
        .select('*')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as IcSession | null
    },
  })
}

export function useInventoryEntries(sessionId: string | null) {
  return useQuery({
    queryKey: ['ic_entries', sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<Map<string, IcEntry>> => {
      const { data, error } = await supabase
        .from('inventory_count_entries')
        .select('*')
        .eq('session_id', sessionId!)
      if (error) throw error
      const map = new Map<string, IcEntry>()
      for (const e of (data ?? []) as IcEntry[]) {
        map.set(e.part_id, e)
      }
      return map
    },
  })
}
