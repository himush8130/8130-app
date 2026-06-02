import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ServiceCall, TankSpecialty } from '../types/db'

/**
 * Calls visible to a technician:
 *  - status is in_treatment OR waiting_for_parts (active)
 *  - profession_name matches the technician's profession
 *  - for tank calls (profession='טנק') with non-empty specialties,
 *    only those whose specialty matches the technician's specialty
 *    (a call with empty specialties is a catch-all that hits every
 *    tank tech; a tech with no specialty also sees everything in
 *    profession='טנק' so they remain reachable).
 *
 * Mirrors the relevance logic in useCallContacts so a technician
 * only sees the calls on which they'd appear as a contact.
 */
export function useTechnicianCalls(
  professionName: string | null,
  techSpecialty: TankSpecialty | null = null,
) {
  return useQuery({
    queryKey: ['service_calls', 'by-profession', professionName, techSpecialty],
    enabled: professionName !== null,
    queryFn: async (): Promise<ServiceCall[]> => {
      const { data, error } = await supabase
        .from('service_calls')
        .select('*')
        .eq('profession_name', professionName!)
        .in('status', ['in_treatment', 'waiting_for_parts'])
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows = (data ?? []) as ServiceCall[]
      if (professionName !== 'טנק' || techSpecialty == null) return rows
      return rows.filter((c) => {
        const specs = c.specialties ?? []
        if (specs.length === 0) return true
        return specs.includes(techSpecialty)
      })
    },
  })
}
