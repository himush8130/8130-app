import { useMemo } from 'react'
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

/** Same data as useVehicles, but indexed for O(1) lookup by vehicle_number. */
export function useVehiclesMap(): Map<string, Vehicle> {
  const { data } = useVehicles()
  return useMemo(() => {
    const m = new Map<string, Vehicle>()
    for (const v of data ?? []) m.set(v.vehicle_number, v)
    return m
  }, [data])
}
