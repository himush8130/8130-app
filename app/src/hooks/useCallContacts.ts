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
 *   - All technicians whose profession matches the call's profession_name
 */
export function useCallContacts(professionName: string | null | undefined) {
  return useQuery({
    queryKey: ['call_contacts', professionName],
    queryFn: async (): Promise<ContactPerson[]> => {
      const { data: emps, error: empErr } = await supabase
        .from('employees')
        .select('*')
        .order('permissions')
        .order('name')
      if (empErr) throw empErr

      const relevant = (emps ?? []).filter((e: Employee) => {
        if (e.permissions === 'manager' || e.permissions === 'warehouse') return true
        if (e.permissions === 'technician') {
          return professionName != null && e.profession_name === professionName
        }
        return false
      })

      if (relevant.length === 0) return []

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
