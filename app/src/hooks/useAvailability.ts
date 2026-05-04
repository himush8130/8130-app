import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface AvailabilityRow {
  employee_number: number
  date: string  // YYYY-MM-DD
  reason: string | null
}

/** Fetches all unavailable rows for one employee (sparse table). */
export function useEmployeeAvailability(employeeNumber: number | null | undefined) {
  return useQuery({
    queryKey: ['availability', employeeNumber],
    enabled: employeeNumber != null,
    queryFn: async (): Promise<AvailabilityRow[]> => {
      const { data, error } = await supabase
        .from('employee_availability')
        .select('*')
        .eq('employee_number', employeeNumber!)
        .order('date')
      if (error) throw error
      return (data ?? []) as AvailabilityRow[]
    },
  })
}
