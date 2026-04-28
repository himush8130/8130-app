import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface ProfessionWithUsage {
  id: number
  name: string
  vehicles_count: number
  employees_count: number
}

export function useProfessionsWithUsage() {
  return useQuery({
    queryKey: ['professions_with_usage'],
    queryFn: async (): Promise<ProfessionWithUsage[]> => {
      const [profsRes, vehiclesRes, employeesRes] = await Promise.all([
        supabase.from('professions').select('id, name').order('id'),
        supabase.from('vehicles').select('type_id'),
        supabase.from('employees').select('profession_id'),
      ])
      if (profsRes.error)     throw profsRes.error
      if (vehiclesRes.error)  throw vehiclesRes.error
      if (employeesRes.error) throw employeesRes.error

      const vehicles  = vehiclesRes.data ?? []
      const employees = employeesRes.data ?? []

      return (profsRes.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        vehicles_count:  vehicles.filter((v)  => v.type_id === p.id).length,
        employees_count: employees.filter((e) => e.profession_id === p.id).length,
      }))
    },
  })
}
