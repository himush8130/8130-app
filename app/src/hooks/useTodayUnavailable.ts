import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { todayIsoLocal } from '../lib/attendanceReport'

/** Returns the set of employee_numbers that are unavailable today. */
export function useTodayUnavailable() {
  const today = todayIsoLocal()
  return useQuery({
    queryKey: ['availability', 'today', today],
    queryFn: async (): Promise<Set<number>> => {
      const { data, error } = await supabase
        .from('employee_availability')
        .select('employee_number')
        .eq('date', today)
      if (error) throw error
      return new Set((data ?? []).map((r: { employee_number: number }) => r.employee_number))
    },
  })
}
