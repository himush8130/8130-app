import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useVehicles } from './useVehicles'
import { weekStartIso, addWeeksIso } from '../lib/tankMaintenanceWeek'

export interface TankMonthlyRow {
  vehicle_number: string
  week_start: string  // YYYY-MM-DD (Sunday)
}

/** Fetches all weeks marked monthly for one tank. */
export function useTankMonthlyMaintenance(vehicleNumber: string | null | undefined) {
  return useQuery({
    queryKey: ['tank_monthly_maintenance', vehicleNumber],
    enabled: vehicleNumber != null && vehicleNumber !== '',
    queryFn: async (): Promise<TankMonthlyRow[]> => {
      const { data, error } = await supabase
        .from('tank_monthly_maintenance')
        .select('vehicle_number, week_start')
        .eq('vehicle_number', vehicleNumber!)
        .order('week_start')
      if (error) throw error
      return (data ?? []) as TankMonthlyRow[]
    },
  })
}

export interface TankMaintenanceOverviewRow {
  vehicle_number: string
  sub_department: string | null  // פלוגה
  thisWeek: 'שבועי' | 'חודשי'
  nextWeek: 'שבועי' | 'חודשי'
}

// Manager's preferred company order: ל, then כ, then מ, then anything
// else (e.g. מפג״ד) at the bottom. Sub-department values look like
// "פלוגה ל" / "פלוגה כ" / "פלוגה מ", so we match by inclusion rather
// than by the first character.
const COMPANY_ORDER = ['ל', 'כ', 'מ']
function companyRank(sub: string | null): number {
  if (!sub) return COMPANY_ORDER.length + 1
  for (let i = 0; i < COMPANY_ORDER.length; i++) {
    if (sub.includes(`פלוגה ${COMPANY_ORDER[i]}`)) return i
    // Fallback: a bare letter as the entire sub_department.
    if (sub.trim() === COMPANY_ORDER[i]) return i
  }
  return COMPANY_ORDER.length
}

export interface MonthlyMaintenanceCompanies {
  thisWeekCompany: string | null
  nextWeekCompany: string | null
  thisWeekIso: string
  nextWeekIso: string
}

/**
 * Company-level monthly-maintenance view. Although the data is stored
 * per-tank, monthly maintenance is really a company rotation — so for a
 * given week we take the company with the most tanks marked monthly as
 * "the company in monthly maintenance" that week.
 */
export function useMonthlyMaintenanceCompany() {
  const now = new Date()
  const thisIso = weekStartIso(now)
  const nextIso = addWeeksIso(now, 1)

  return useQuery({
    queryKey: ['monthly_maintenance_company', thisIso, nextIso],
    queryFn: async (): Promise<MonthlyMaintenanceCompanies> => {
      const { data, error } = await supabase
        .from('tank_monthly_maintenance')
        .select('week_start, vehicles(sub_department)')
        .in('week_start', [thisIso, nextIso])
      if (error) throw error

      const counts: Record<string, Map<string, number>> = {
        [thisIso]: new Map(),
        [nextIso]: new Map(),
      }
      type JoinRow = { week_start: string; vehicles: { sub_department: string | null } | { sub_department: string | null }[] | null }
      for (const row of (data ?? []) as unknown as JoinRow[]) {
        const v = Array.isArray(row.vehicles) ? row.vehicles[0] : row.vehicles
        const co = v?.sub_department
        const bucket = counts[row.week_start]
        if (!co || !bucket) continue
        bucket.set(co, (bucket.get(co) ?? 0) + 1)
      }

      const dominant = (m: Map<string, number>): string | null => {
        let best: string | null = null
        let bestN = 0
        for (const [co, n] of m) if (n > bestN) { best = co; bestN = n }
        return best
      }

      return {
        thisWeekCompany: dominant(counts[thisIso]),
        nextWeekCompany: dominant(counts[nextIso]),
        thisWeekIso: thisIso,
        nextWeekIso: nextIso,
      }
    },
  })
}

/** Returns each tank with this-week/next-week treatment kind. */
export function useTankMaintenanceOverview() {
  const { data: vehicles } = useVehicles()
  const tanks = useMemo(
    () => (vehicles ?? []).filter((v) => v.type_name === 'טנק'),
    [vehicles],
  )

  const now = new Date()
  const thisIso = weekStartIso(now)
  const nextIso = addWeeksIso(now, 1)

  const tankNumbers = tanks.map((t) => t.vehicle_number)

  const monthlyQuery = useQuery({
    queryKey: ['tank_monthly_maintenance', 'overview', thisIso, nextIso, tankNumbers.join(',')],
    enabled: tankNumbers.length > 0,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('tank_monthly_maintenance')
        .select('vehicle_number, week_start')
        .in('week_start', [thisIso, nextIso])
        .in('vehicle_number', tankNumbers)
      if (error) throw error
      // Compose key as `${vehicle_number}|${week_start}` so we can ask either week per tank.
      const set = new Set<string>()
      for (const row of (data ?? []) as TankMonthlyRow[]) {
        set.add(`${row.vehicle_number}|${row.week_start}`)
      }
      return set
    },
  })

  const rows: TankMaintenanceOverviewRow[] = useMemo(() => {
    const monthly = monthlyQuery.data ?? new Set<string>()
    return tanks
      .map((t) => ({
        vehicle_number: t.vehicle_number,
        sub_department: t.sub_department,
        thisWeek: monthly.has(`${t.vehicle_number}|${thisIso}`) ? 'חודשי' : 'שבועי',
        nextWeek: monthly.has(`${t.vehicle_number}|${nextIso}`) ? 'חודשי' : 'שבועי',
      } as TankMaintenanceOverviewRow))
      .sort((a, b) => {
        const ca = companyRank(a.sub_department)
        const cb = companyRank(b.sub_department)
        if (ca !== cb) return ca - cb
        return a.vehicle_number.localeCompare(b.vehicle_number)
      })
  }, [tanks, monthlyQuery.data, thisIso, nextIso])

  return {
    rows,
    isLoading: monthlyQuery.isLoading || !vehicles,
    thisWeekIso: thisIso,
    nextWeekIso: nextIso,
  }
}
