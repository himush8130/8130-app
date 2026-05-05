import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface VehicleCallStats {
  open:     number
  disabled: boolean   // at least one open call is_disabling
}

const ACTIVE_STATUSES = ['in_treatment', 'waiting_for_parts', 'new']

/** Map vehicle_number → counts/flags for the active calls on that vehicle. */
export function useVehicleCallStats() {
  return useQuery({
    queryKey: ['vehicle_call_stats'],
    queryFn: async (): Promise<Map<string, VehicleCallStats>> => {
      const { data, error } = await supabase
        .from('service_calls')
        .select('vehicle_number, is_disabling')
        .in('status', ACTIVE_STATUSES)
      if (error) throw error

      const map = new Map<string, VehicleCallStats>()
      for (const row of data ?? []) {
        if (!row.vehicle_number) continue
        const cur = map.get(row.vehicle_number) ?? { open: 0, disabled: false }
        cur.open += 1
        if (row.is_disabling) cur.disabled = true
        map.set(row.vehicle_number, cur)
      }
      return map
    },
  })
}
