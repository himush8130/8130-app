import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Vehicle, ServiceCall } from '../types/db'

interface VehicleWithProfession extends Vehicle {
  professions?: { name: string } | null
}

export interface VehicleHistory {
  vehicle: VehicleWithProfession | null
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
          .select('*, professions:type_id(name)')
          .eq('vehicle_number', vehicleNumber!)
          .maybeSingle(),
        supabase
          .from('service_calls')
          .select('*, professions(name)')
          .eq('vehicle_number', vehicleNumber!)
          .order('created_at', { ascending: false }),
      ])
      if (vehicleRes.error) throw vehicleRes.error
      if (callsRes.error)   throw callsRes.error
      return {
        vehicle: (vehicleRes.data as VehicleWithProfession | null) ?? null,
        calls:   (callsRes.data ?? []) as ServiceCall[],
      }
    },
  })
}
