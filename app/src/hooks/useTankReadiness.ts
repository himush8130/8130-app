import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface CompanyReadiness {
  /** Composite key joined by " · " for the table; useful for React keys. */
  key:           string
  /** One value per groupBy column, in the same order. */
  groupValues:   string[]
  total:         number
  healthy:       number  // no active calls
  with_issues:   number  // active calls but none disabling
  disabled:      number  // at least one active disabling call
}

export interface TankReadiness {
  byCompany: CompanyReadiness[]
  totals:    Omit<CompanyReadiness, 'key' | 'groupValues'>
}

const ACTIVE_STATUSES = ['in_treatment', 'waiting_for_parts', 'new']

/**
 * Aggregate readiness for a vehicle type, grouped by one or more columns.
 *
 * @param typeName  Filter vehicles by exact type_name (e.g. 'טנק')
 * @param groupBy   One column name or an ordered list of columns. The
 *                  table renders one column per entry.
 */
export function useTankReadiness(
  typeName: string = 'טנק',
  groupBy: string | string[] = 'sub_department',
) {
  const cols = Array.isArray(groupBy) ? groupBy : [groupBy]
  return useQuery({
    queryKey: ['readiness', typeName, cols.join(',')],
    queryFn: async (): Promise<TankReadiness> => {
      const [vehiclesRes, callsRes] = await Promise.all([
        supabase
          .from('vehicles')
          .select(`vehicle_number, ${cols.join(', ')}`)
          .eq('type_name', typeName),
        supabase
          .from('service_calls')
          .select('vehicle_number, is_disabling')
          .in('status', ACTIVE_STATUSES),
      ])
      if (vehiclesRes.error) throw vehiclesRes.error
      if (callsRes.error)    throw callsRes.error

      const vehicles = (vehiclesRes.data ?? []) as unknown as Array<Record<string, string | null>>
      const calls    = callsRes.data ?? []

      const callsByVehicle = new Map<string, Array<{ is_disabling: boolean }>>()
      for (const c of calls) {
        if (!c.vehicle_number) continue
        const arr = callsByVehicle.get(c.vehicle_number) ?? []
        arr.push({ is_disabling: !!c.is_disabling })
        callsByVehicle.set(c.vehicle_number, arr)
      }

      const groups = new Map<string, CompanyReadiness>()
      for (const v of vehicles) {
        const groupValues = cols.map((c) => v[c] || '—')
        const key = groupValues.join(' · ')
        const g = groups.get(key) ?? {
          key,
          groupValues,
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
        a.key.localeCompare(b.key, 'he'),
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
