import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Employee } from '../types/db'

export interface ContactPerson extends Employee {
  /** True when employee has NO availability row marking today as off. */
  available_today: boolean
}

/**
 * Returns contacts relevant to a service call:
 *   - All managers (always shown)
 *   - All warehouse staff (always shown)
 *   - All technicians whose profession matches the call's profession_id
 */
export function useCallContacts(professionId: number | null | undefined) {
  return useQuery({
    queryKey: ['call_contacts', professionId],
    queryFn: async (): Promise<ContactPerson[]> => {
      // Build a profession filter: managers/warehouse always; technicians filtered.
      const { data: emps, error: empErr } = await supabase
        .from('employees')
        .select('*')
        .order('role')
        .order('name')
      if (empErr) throw empErr

      const relevant = (emps ?? []).filter((e: Employee) => {
        if (e.role === 'manager' || e.role === 'warehouse') return true
        if (e.role === 'technician') {
          return professionId != null && e.profession_id === professionId
        }
        return false
      })

      if (relevant.length === 0) return []

      // Mark who's unavailable today.
      const today = new Date().toISOString().slice(0, 10)
      const empNums = relevant.map((e) => e.employee_number)
      const { data: unavail, error: unErr } = await supabase
        .from('employee_availability')
        .select('employee_number')
        .in('employee_number', empNums)
        .eq('date', today)
      if (unErr) throw unErr
      const unavailSet = new Set((unavail ?? []).map((r) => r.employee_number))

      return relevant.map((e) => ({
        ...(e as Employee),
        available_today: !unavailSet.has(e.employee_number),
      }))
    },
  })
}
