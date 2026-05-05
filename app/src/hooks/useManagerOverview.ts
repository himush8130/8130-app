import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface OpenCallsBucket {
  /** "כ" / "ל" / ... for tank companies, or "כללי" for everything else. */
  label: string
  total: number
  disabling: number
}

export interface ManagerOverview {
  openCalls:       number
  urgentAnomalies: number
  lowStockParts:   number
  /** Tank companies (sorted) followed by a final "כללי" bucket if any. */
  openCallsBreakdown: OpenCallsBucket[]
}

const ACTIVE_STATUSES = ['in_treatment', 'waiting_for_parts']
const NON_TANK_LABEL  = 'כללי'

export function useManagerOverview() {
  return useQuery({
    queryKey: ['manager_overview'],
    queryFn: async (): Promise<ManagerOverview> => {
      const [openCallsRes, anomaliesRes, partsRes, vehiclesRes] = await Promise.all([
        supabase
          .from('service_calls')
          .select('id, vehicle_number, is_disabling')
          .in('status', ACTIVE_STATUSES),
        supabase
          .from('service_calls')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new'),
        supabase
          .from('parts')
          .select('sku, quantity, min_threshold')
          .order('sku'),
        supabase
          .from('vehicles')
          .select('vehicle_number, type_name, sub_department'),
      ])

      const lowStock = (partsRes.data ?? []).filter(
        (p) => p.quantity < p.min_threshold,
      ).length

      // Group active calls by tank-company / non-tank.
      const vehicleMeta = new Map<string, { type_name: string; sub_department: string | null }>()
      for (const v of vehiclesRes.data ?? []) {
        vehicleMeta.set(v.vehicle_number, {
          type_name:      v.type_name,
          sub_department: v.sub_department,
        })
      }

      const tankBuckets   = new Map<string, OpenCallsBucket>()
      const nonTankBucket: OpenCallsBucket = { label: NON_TANK_LABEL, total: 0, disabling: 0 }
      const openCalls = openCallsRes.data ?? []

      for (const c of openCalls) {
        const meta = c.vehicle_number ? vehicleMeta.get(c.vehicle_number) : undefined
        if (meta?.type_name === 'טנק' && meta.sub_department) {
          const key = meta.sub_department
          const b = tankBuckets.get(key) ?? { label: key, total: 0, disabling: 0 }
          b.total += 1
          if (c.is_disabling) b.disabling += 1
          tankBuckets.set(key, b)
        } else {
          nonTankBucket.total += 1
          if (c.is_disabling) nonTankBucket.disabling += 1
        }
      }

      const sortedTanks = [...tankBuckets.values()].sort((a, b) =>
        a.label.localeCompare(b.label, 'he'),
      )
      const openCallsBreakdown = nonTankBucket.total > 0
        ? [...sortedTanks, nonTankBucket]
        : sortedTanks

      return {
        openCalls:          openCalls.length,
        urgentAnomalies:    anomaliesRes.count ?? 0,
        lowStockParts:      lowStock,
        openCallsBreakdown,
      }
    },
  })
}
