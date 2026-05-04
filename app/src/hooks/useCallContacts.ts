import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Employee, TankSpecialty } from '../types/db'

export interface ContactPerson extends Employee {
  /** True when employee has NO availability row marking today as off. */
  available_today: boolean
}

/**
 * Returns contacts relevant to a service call:
 *   - All managers (always shown)
 *   - All warehouse staff (always shown)
 *   - All technicians whose profession matches the call's profession_name
 *
 * For tank calls (profession_name='טנק') with non-empty `specialties`,
 * tank technicians are further filtered to those whose own specialty
 * appears in the call's list. Tank technicians with no specialty are
 * still shown so they remain reachable.
 */
export function useCallContacts(
  professionName: string | null | undefined,
  callSpecialties: TankSpecialty[] | null | undefined = null,
) {
  const specKey = (callSpecialties ?? []).slice().sort().join(',')

  return useQuery({
    queryKey: ['call_contacts', professionName, specKey],
    queryFn: async (): Promise<ContactPerson[]> => {
      const { data: emps, error: empErr } = await supabase
        .from('employees')
        .select('*')
        .order('permissions')
        .order('name')
      if (empErr) throw empErr

      const isTankCall = professionName === 'טנק'
      const specs = isTankCall && callSpecialties && callSpecialties.length > 0 ? callSpecialties : null

      const relevant = (emps ?? []).filter((e: Employee) => {
        if (e.permissions === 'manager' || e.permissions === 'warehouse') return true
        if (e.permissions === 'technician') {
          if (professionName == null || e.profession_name !== professionName) return false
          if (specs == null) return true
          // Tank call with explicit specialties: keep matching techs + uncategorized.
          if (e.specialty == null) return true
          return specs.includes(e.specialty)
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
