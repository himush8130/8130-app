import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface ClassOrder {
  id:              string
  call_id:         string
  tsakah:          string | null
  model:           string | null
  class_required:  string
  vehicle_number:  string | null
  fault:           string | null
  parts_available: string | null  // 'יש' / 'אין'
  target_date:     string         // YYYY-MM-DD
  location:        string | null
  contact_name:    string | null
  contact_phone:   string | null
  crossing_gvul:   string         // 'yes' / 'no'
  created_by:      number | null
  created_at:      string
  updated_at:      string
}

export interface ClassOrderWithCall extends ClassOrder {
  service_calls: { display_id: string; vehicle_number: string | null } | null
}

/** Single class_order for a specific call (or null if none yet). */
export function useCallClassOrder(callId: string | null | undefined) {
  return useQuery({
    queryKey: ['class_order', callId],
    enabled: !!callId,
    queryFn: async (): Promise<ClassOrder | null> => {
      const { data, error } = await supabase
        .from('class_orders')
        .select('*')
        .eq('call_id', callId!)
        .maybeSingle()
      if (error) throw error
      return (data ?? null) as ClassOrder | null
    },
  })
}

/** All class orders for the manager dashboard, newest first. */
export function useAllClassOrders() {
  return useQuery({
    queryKey: ['class_orders'],
    queryFn: async (): Promise<ClassOrderWithCall[]> => {
      const { data, error } = await supabase
        .from('class_orders')
        .select('*, service_calls(display_id, vehicle_number)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ClassOrderWithCall[]
    },
  })
}
