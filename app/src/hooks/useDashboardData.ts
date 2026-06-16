import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const ACTIVE_STATUSES = ['in_treatment', 'waiting_for_parts', 'new']
const THRESHOLD_OFFSET = 200

export interface DashboardCompany {
  label: string
  totalTanks: number
  openCalls: number
  disabling: number
  waitingParts: number
  avgOpenMinutes: number
  /** Tanks with at least one active disabling call. */
  disabledTanks: number
  /** Calls closed in the last 14 days for this company. */
  closedLast14: number
  /** Calls with at least one part in 'received' status. */
  receivedCalls: number
  // Priority sub-scores, each normalised to 0–1 (importance is applied
  // separately from manager config). See useDashboardData for formulas.
  scoreDisabling: number
  scoreOpenCalls: number
  scoreCloseRate: number
  scoreReceived: number
}

export interface EngineAlert {
  vehicleNumber: string
  company: string
  engineHours: number
  deviation: number
}

export interface TankEngineRow {
  vehicleNumber: string
  company: string
  engineHours: number | null
  /** Hours past the service threshold; null only when over threshold check fails. */
  deviation: number | null
  /** Signed hours relative to the service threshold (negative = not yet due).
   *  null when engine-hours or threshold are unknown. */
  rawDeviation: number | null
}

export interface TankCompanyReadiness {
  company: string
  total: number
  operational: number
  pct: number
}

export interface WheeledRow {
  department: string
  subDepartment: string
  total: number
  healthy: number
  issues: number
  disabled: number
  pct: number
}

export interface DisablingCall {
  id: string
  vehicleNumber: string
  company: string
  description: string
}

export interface DashboardData {
  totalOpenCalls: number
  totalDisabling: number
  disablingCalls: DisablingCall[]
  overallTankReadinessPct: number
  companies: DashboardCompany[]
  engineAlerts: EngineAlert[]
  allTanksEngine: TankEngineRow[]
  /** Tanks whose engine-hours exceed the service threshold by more than
   *  150 hours (the yellow category and above). */
  treatmentDeviations: number
  tankReadiness: TankCompanyReadiness[]
  totalTanks: number
  totalTankOperational: number
  wheeledReadiness: WheeledRow[]
  totalWheeled: number
  overallWheeledPct: number
}

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard_data'],
    queryFn: async (): Promise<DashboardData> => {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      const [callsRes, tanksRes, wheeledRes, closedRes, receivedRes] = await Promise.all([
        supabase
          .from('service_calls')
          .select('id, vehicle_number, is_disabling, status, created_at, description')
          .in('status', ACTIVE_STATUSES),
        supabase
          .from('vehicles')
          .select('vehicle_number, sub_department, current_engine_hours, initial_engine_hours')
          .eq('type_name', 'טנק'),
        supabase
          .from('vehicles')
          .select('vehicle_number, department, sub_department')
          .neq('type_name', 'טנק'),
        supabase
          .from('service_calls')
          .select('vehicle_number')
          .eq('status', 'closed')
          .gte('closed_at', fourteenDaysAgo),
        supabase
          .from('call_required_parts')
          .select('call_id, service_calls(vehicle_number)')
          .eq('status', 'received'),
      ])

      const calls = callsRes.data ?? []
      const tanks = tanksRes.data ?? []
      const wheeled = wheeledRes.data ?? []
      const closedCalls = closedRes.data ?? []
      const receivedParts = receivedRes.data ?? []

      const tankLookup = new Map<string, string>()
      for (const t of tanks) if (t.sub_department) tankLookup.set(t.vehicle_number, t.sub_department)

      const tanksPerCo = new Map<string, number>()
      for (const t of tanks) {
        const co = t.sub_department || '—'
        tanksPerCo.set(co, (tanksPerCo.get(co) ?? 0) + 1)
      }

      const vehicleCompany = new Map<string, string>()
      for (const t of tanks) vehicleCompany.set(t.vehicle_number, t.sub_department || '—')
      for (const w of wheeled) vehicleCompany.set(w.vehicle_number, w.sub_department || w.department || '—')

      let totalDisabling = 0
      const disablingCalls: DisablingCall[] = []
      type Acc = { open: number; dis: number; wp: number; totalMin: number; n: number }
      const coAcc = new Map<string, Acc>()
      const vCalls = new Map<string, { dis: boolean }>()
      const now = Date.now()

      for (const c of calls) {
        if (c.is_disabling) {
          totalDisabling++
          disablingCalls.push({
            id: c.id,
            vehicleNumber: c.vehicle_number || '—',
            company: c.vehicle_number ? vehicleCompany.get(c.vehicle_number) || '—' : '—',
            description: (c as any).description || '—',
          })
        }
        if (c.vehicle_number) {
          const vc = vCalls.get(c.vehicle_number) ?? { dis: false }
          if (c.is_disabling) vc.dis = true
          vCalls.set(c.vehicle_number, vc)
        }
        const co = c.vehicle_number ? tankLookup.get(c.vehicle_number) : null
        if (!co) continue
        const a = coAcc.get(co) ?? { open: 0, dis: 0, wp: 0, totalMin: 0, n: 0 }
        a.open++
        if (c.is_disabling) a.dis++
        if (c.status === 'waiting_for_parts') a.wp++
        a.totalMin += (now - new Date(c.created_at).getTime()) / 60000
        a.n++
        coAcc.set(co, a)
      }

      // Disabled tanks per company (a tank with ≥1 active disabling call).
      const disabledByCo = new Map<string, number>()
      for (const t of tanks) {
        if (vCalls.get(t.vehicle_number)?.dis) {
          const co = t.sub_department || '—'
          disabledByCo.set(co, (disabledByCo.get(co) ?? 0) + 1)
        }
      }

      // Calls closed in the last 14 days, per company + grand total.
      const closedByCo = new Map<string, number>()
      let totalClosed = 0
      for (const c of closedCalls) {
        const co = c.vehicle_number ? tankLookup.get(c.vehicle_number) : null
        if (!co) continue
        closedByCo.set(co, (closedByCo.get(co) ?? 0) + 1)
        totalClosed++
      }

      // Distinct calls with a part in 'received' status, per company.
      type RP = { call_id: string | null; service_calls: { vehicle_number: string | null } | { vehicle_number: string | null }[] | null }
      const receivedByCo = new Map<string, Set<string>>()
      for (const r of receivedParts as unknown as RP[]) {
        const sc = Array.isArray(r.service_calls) ? r.service_calls[0] : r.service_calls
        const vn = sc?.vehicle_number
        const co = vn ? tankLookup.get(vn) : null
        if (!co || !r.call_id) continue
        const set = receivedByCo.get(co) ?? new Set<string>()
        set.add(r.call_id)
        receivedByCo.set(co, set)
      }

      const allLabels = [...new Set([...tanksPerCo.keys(), ...coAcc.keys()])]
      const pluga = allLabels.filter(l => l.startsWith('פלוגה')).sort((a, b) => b.localeCompare(a, 'he'))
      const other = allLabels.filter(l => !l.startsWith('פלוגה')).sort((a, b) => a.localeCompare(b, 'he'))
      const sortedLabels = [...pluga, ...other]

      // Raw values per company, then the cross-company maxes used for
      // the normalised "per max" sub-scores (params 2 and 5).
      const raw = sortedLabels.map(label => {
        const a = coAcc.get(label)
        const totalTanks = tanksPerCo.get(label) ?? 0
        const openCalls = a?.open ?? 0
        return {
          label,
          totalTanks,
          openCalls,
          disabling: a?.dis ?? 0,
          waitingParts: a?.wp ?? 0,
          avgOpenMinutes: a && a.n > 0 ? Math.round(a.totalMin / a.n) : 0,
          disabledTanks: disabledByCo.get(label) ?? 0,
          closedLast14: closedByCo.get(label) ?? 0,
          receivedCalls: receivedByCo.get(label)?.size ?? 0,
          callsPerTank: totalTanks > 0 ? openCalls / totalTanks : 0,
        }
      })
      const maxCallsPerTank = Math.max(0, ...raw.map(r => r.callsPerTank))
      const maxReceived = Math.max(0, ...raw.map(r => r.receivedCalls))

      const companies: DashboardCompany[] = raw.map(r => ({
        label: r.label,
        totalTanks: r.totalTanks,
        openCalls: r.openCalls,
        disabling: r.disabling,
        waitingParts: r.waitingParts,
        avgOpenMinutes: r.avgOpenMinutes,
        disabledTanks: r.disabledTanks,
        closedLast14: r.closedLast14,
        receivedCalls: r.receivedCalls,
        // Param 1 — % of disabled tanks.
        scoreDisabling: r.totalTanks > 0 ? r.disabledTanks / r.totalTanks : 0,
        // Param 2 — open calls per tank, normalised to the busiest company.
        scoreOpenCalls: maxCallsPerTank > 0 ? r.callsPerTank / maxCallsPerTank : 0,
        // Param 4 — fewer closures (last 14d) relative to total ⇒ higher.
        scoreCloseRate: totalClosed > 0 ? 1 - r.closedLast14 / totalClosed : 0,
        // Param 5 — calls with received parts, normalised to the max.
        scoreReceived: maxReceived > 0 ? r.receivedCalls / maxReceived : 0,
      }))

      const engineAlerts: EngineAlert[] = []
      const allTanksEngine: TankEngineRow[] = []
      for (const t of tanks) {
        const threshold = t.initial_engine_hours != null ? t.initial_engine_hours + THRESHOLD_OFFSET : null
        const rawDeviation = (t.current_engine_hours != null && threshold != null)
          ? t.current_engine_hours - threshold : null
        const deviation = rawDeviation != null && rawDeviation > 0 ? rawDeviation : null
        allTanksEngine.push({
          vehicleNumber: t.vehicle_number,
          company: t.sub_department || '—',
          engineHours: t.current_engine_hours,
          deviation,
          rawDeviation,
        })
        if (deviation != null) {
          engineAlerts.push({
            vehicleNumber: t.vehicle_number,
            company: t.sub_department || '—',
            engineHours: t.current_engine_hours!,
            deviation,
          })
        }
      }
      engineAlerts.sort((a, b) => b.deviation - a.deviation)
      // Sort all tanks by how close they are to / past the threshold
      // (highest raw deviation first); unknown values sink to the bottom.
      allTanksEngine.sort((a, b) => (b.rawDeviation ?? -Infinity) - (a.rawDeviation ?? -Infinity))

      const treatmentDeviations = allTanksEngine.filter(
        t => t.rawDeviation != null && t.rawDeviation >= -50,
      ).length

      const readMap = new Map<string, { total: number; op: number }>()
      for (const t of tanks) {
        const co = t.sub_department || '—'
        const r = readMap.get(co) ?? { total: 0, op: 0 }
        r.total++
        if (!vCalls.get(t.vehicle_number)?.dis) r.op++
        readMap.set(co, r)
      }
      const tankReadiness = sortedLabels
        .filter(l => readMap.has(l))
        .map(company => {
          const r = readMap.get(company)!
          return { company, total: r.total, operational: r.op, pct: r.total > 0 ? Math.round((r.op / r.total) * 100) : 0 }
        })

      const totalTankOp = tankReadiness.reduce((s, r) => s + r.operational, 0)

      const wGroups = new Map<string, { total: number; healthy: number; issues: number; disabled: number }>()
      for (const w of wheeled) {
        const key = `${w.department || '—'}|${w.sub_department || '—'}`
        const g = wGroups.get(key) ?? { total: 0, healthy: 0, issues: 0, disabled: 0 }
        g.total++
        const vc = vCalls.get(w.vehicle_number)
        if (!vc) g.healthy++
        else if (vc.dis) g.disabled++
        else g.issues++
        wGroups.set(key, g)
      }
      const wheeledReadiness = [...wGroups.entries()]
        .sort(([a], [b]) => a.localeCompare(b, 'he'))
        .map(([key, g]) => {
          const [department, subDepartment] = key.split('|')
          return { department, subDepartment, ...g, pct: g.total > 0 ? Math.round(((g.healthy + g.issues) / g.total) * 100) : 0 }
        })

      const totalWOp = wheeledReadiness.reduce((s, r) => s + r.healthy + r.issues, 0)

      return {
        totalOpenCalls: calls.length,
        totalDisabling,
        disablingCalls,
        overallTankReadinessPct: tanks.length > 0 ? Math.round((totalTankOp / tanks.length) * 100) : 0,
        companies,
        engineAlerts,
        allTanksEngine,
        treatmentDeviations,
        tankReadiness,
        totalTanks: tanks.length,
        totalTankOperational: totalTankOp,
        wheeledReadiness,
        totalWheeled: wheeled.length,
        overallWheeledPct: wheeled.length > 0 ? Math.round((totalWOp / wheeled.length) * 100) : 0,
      }
    },
  })
}
