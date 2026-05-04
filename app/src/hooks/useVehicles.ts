import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Vehicle } from '../types/db'

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: async (): Promise<Vehicle[]> => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('vehicle_number')
      if (error) throw error
      return (data ?? []) as Vehicle[]
    },
  })
}
