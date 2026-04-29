import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CallStatus } from '../types/db'

export interface ProfessionLoad {
  profession_name: string
  open_total: number
  waiting_for_parts: number
  technician_count: number
}

export interface StatusDistribution {
  status: CallStatus
  count: number
}

export interface ManagerReports {
  byProfession: ProfessionLoad[]
  byStatus: StatusDistribution[]
}

const ALL_STATUSES: CallStatus[] = [
  'new', 'in_treatment', 'waiting_for_parts', 'closed', 'cancelled',
]

export function useManagerReports() {
  return useQuery({
    queryKey: ['manager_reports'],
    queryFn: async (): Promise<ManagerReports> => {
      const [callsRes, profsRes, employeesRes] = await Promise.all([
        supabase
          .from('service_calls')
          .select('profession_name, status'),
        supabase
          .from('professions')
          .select('name')
          .order('name'),
        supabase
          .from('employees')
          .select('profession_name, permissions')
          .eq('permissions', 'technician'),
      ])
      if (callsRes.error)     throw callsRes.error
      if (profsRes.error)     throw profsRes.error
      if (employeesRes.error) throw employeesRes.error

      const calls = callsRes.data ?? []
      const professions = profsRes.data ?? []
      const employees = employeesRes.data ?? []

      const byStatus: StatusDistribution[] = ALL_STATUSES.map((s) => ({
        status: s,
        count: calls.filter((c) => c.status === s).length,
      }))

      const byProfession: ProfessionLoad[] = professions.map((p) => {
        const callsForProf = calls.filter((c) => c.profession_name === p.name)
        return {
          profession_name: p.name,
          open_total: callsForProf.filter((c) =>
            c.status === 'in_treatment' || c.status === 'waiting_for_parts',
          ).length,
          waiting_for_parts: callsForProf.filter((c) => c.status === 'waiting_for_parts').length,
          technician_count: employees.filter((e) => e.profession_name === p.name).length,
        }
      })

      const unclassifiedActive = calls.filter(
        (c) => c.profession_name === null &&
               (c.status === 'new' || c.status === 'in_treatment' || c.status === 'waiting_for_parts'),
      ).length
      if (unclassifiedActive > 0) {
        byProfession.push({
          profession_name: '(לא מסווג — חריגה)',
          open_total: unclassifiedActive,
          waiting_for_parts: 0,
          technician_count: 0,
        })
      }

      return { byProfession, byStatus }
    },
  })
}
