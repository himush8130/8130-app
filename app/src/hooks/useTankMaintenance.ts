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
      .sort((a, b) => a.vehicle_number.localeCompare(b.vehicle_number))
  }, [tanks, monthlyQuery.data, thisIso, nextIso])

  return {
    rows,
    isLoading: monthlyQuery.isLoading || !vehicles,
    thisWeekIso: thisIso,
    nextWeekIso: nextIso,
  }
}
