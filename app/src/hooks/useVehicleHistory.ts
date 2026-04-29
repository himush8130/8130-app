import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Vehicle, ServiceCall } from '../types/db'

export interface VehicleHistory {
  vehicle: Vehicle | null
  calls: ServiceCall[]
}

export function useVehicleHistory(vehicleNumber: string | undefined) {
  return useQuery({
    queryKey: ['vehicle_history', vehicleNumber],
    enabled: Boolean(vehicleNumber),
    queryFn: async (): Promise<VehicleHistory> => {
      const [vehicleRes, callsRes] = await Promise.all([
        supabase
          .from('vehicles')
          .select('*')
          .eq('vehicle_number', vehicleNumber!)
          .maybeSingle(),
        supabase
          .from('service_calls')
          .select('*')
          .eq('vehicle_number', vehicleNumber!)
          .order('created_at', { ascending: false }),
      ])
      if (vehicleRes.error) throw vehicleRes.error
      if (callsRes.error)   throw callsRes.error
      return {
        vehicle: (vehicleRes.data as Vehicle | null) ?? null,
        calls:   (callsRes.data ?? []) as ServiceCall[],
      }
    },
  })
}
