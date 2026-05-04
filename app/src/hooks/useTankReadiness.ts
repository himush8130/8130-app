import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface CompanyReadiness {
  sub_department: string  // "ל" / "כ" / "מ" / etc.
  total: number
  healthy: number         // no active calls
  with_issues: number     // active calls but none disabling
  disabled: number        // at least one active disabling call
}

export interface TankReadiness {
  byCompany: CompanyReadiness[]
  totals:    Omit<CompanyReadiness, 'sub_department'>
}

const ACTIVE_STATUSES = ['in_treatment', 'waiting_for_parts', 'new']

/**
 * Aggregate readiness grouped by sub_department (company / פלוגה).
 *
 * @param typeName    Filter vehicles by exact type_name (e.g. 'טנק')
 * @param groupBy     'sub_department' (default) or 'department'
 */
export function useTankReadiness(typeName: string = 'טנק', groupBy: 'sub_department' | 'department' = 'sub_department') {
  return useQuery({
    queryKey: ['readiness', typeName, groupBy],
    queryFn: async (): Promise<TankReadiness> => {
      const [vehiclesRes, callsRes] = await Promise.all([
        supabase
          .from('vehicles')
          .select(`vehicle_number, ${groupBy}`)
          .eq('type_name', typeName),
        supabase
          .from('service_calls')
          .select('vehicle_number, is_disabling')
          .in('status', ACTIVE_STATUSES),
      ])
      if (vehiclesRes.error) throw vehiclesRes.error
      if (callsRes.error)    throw callsRes.error

      const vehicles = vehiclesRes.data ?? []
      const calls    = callsRes.data ?? []

      // For each vehicle, classify based on its open calls.
      const callsByVehicle = new Map<string, Array<{ is_disabling: boolean }>>()
      for (const c of calls) {
        if (!c.vehicle_number) continue
        const arr = callsByVehicle.get(c.vehicle_number) ?? []
        arr.push({ is_disabling: !!c.is_disabling })
        callsByVehicle.set(c.vehicle_number, arr)
      }

      const groups = new Map<string, CompanyReadiness>()
      for (const v of vehicles as Array<Record<string, string | null>>) {
        const key = v[groupBy] || '(ללא קבוצה)'
        const g = groups.get(key) ?? {
          sub_department: key,
          total: 0, healthy: 0, with_issues: 0, disabled: 0,
        }
        g.total += 1

        const myCalls = callsByVehicle.get(v.vehicle_number!) ?? []
        if (myCalls.length === 0) {
          g.healthy += 1
        } else if (myCalls.some((c) => c.is_disabling)) {
          g.disabled += 1
        } else {
          g.with_issues += 1
        }
        groups.set(key, g)
      }

      const byCompany = [...groups.values()].sort((a, b) =>
        a.sub_department.localeCompare(b.sub_department, 'he'),
      )

      const totals = byCompany.reduce(
        (acc, g) => ({
          total:       acc.total       + g.total,
          healthy:     acc.healthy     + g.healthy,
          with_issues: acc.with_issues + g.with_issues,
          disabled:    acc.disabled    + g.disabled,
        }),
        { total: 0, healthy: 0, with_issues: 0, disabled: 0 },
      )

      return { byCompany, totals }
    },
  })
}
