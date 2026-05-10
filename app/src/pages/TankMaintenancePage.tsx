import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useVehicles } from '../hooks/useVehicles'
import { useTankMonthlyMaintenance } from '../hooks/useTankMaintenance'
import { useAuthStore } from '../store/auth'
import { setTankMonthlyWeek } from '../lib/adminActions'
import { generateWeeks, isoLocal } from '../lib/tankMaintenanceWeek'
import { AppHeader } from '../components/AppHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'

const WEEKS_AHEAD = 26 // ~6 months
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

export function TankMaintenancePage() {
  const { vehicleNumber } = useParams<{ vehicleNumber: string }>()
  const employee = useAuthStore((s) => s.employee)!
  const queryClient = useQueryClient()
  const { data: vehicles } = useVehicles()
  const { data: monthly } = useTankMonthlyMaintenance(vehicleNumber)
  const [busy, setBusy] = useState(false)

  const tank = vehicles?.find((v) => v.vehicle_number === vehicleNumber)

  const monthlySet = useMemo(
    () => new Set((monthly ?? []).map((r) => r.week_start)),
    [monthly],
  )

  const weeks = useMemo(() => generateWeeks(new Date(), WEEKS_AHEAD), [])

  async function toggle(weekStart: Date) {
    if (!vehicleNumber) return
    const iso = isoLocal(weekStart)
    const wasMonthly = monthlySet.has(iso)
    setBusy(true)
    await setTankMonthlyWeek(employee.employee_number, vehicleNumber, iso, !wasMonthly)
    setBusy(false)
    queryClient.invalidateQueries({ queryKey: ['tank_monthly_maintenance', vehicleNumber] })
    queryClient.invalidateQueries({ queryKey: ['tank_monthly_maintenance', 'overview'] })
  }

  return (
    <>
      <AppHeader subtitle="טיפול שבועי / חודשי" />
      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-3 pb-24">
        <Link to="/manager/settings/vehicles" className="text-sm text-primary self-start">→ חזור לכלים</Link>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">
                טנק {vehicleNumber}
                {tank?.sub_department && <span className="text-muted font-normal"> · פלוגה {tank.sub_department}</span>}
              </h3>
              <span className="text-xs text-muted">לחץ שבוע כדי להחליף בין שבועי לחודשי</span>
            </div>
          </CardHeader>
          <CardBody>
            {!vehicles ? (
              <p className="text-sm text-muted text-center py-4">טוען...</p>
            ) : !tank ? (
              <p className="text-sm text-danger text-center py-4">לא נמצא כלי</p>
            ) : tank.type_name !== 'טנק' ? (
              <p className="text-sm text-danger text-center py-4">לא טנק — הטיפול הזה רלוונטי רק לטנקים</p>
            ) : (
              <>
                <WeekGrid
                  weeks={weeks}
                  monthlySet={monthlySet}
                  onToggle={toggle}
                  busy={busy}
                />
                <div className="mt-3 text-xs text-muted">
                  ירוק = שבועי (ברירת מחדל), אדום = חודשי. כל לחיצה משנה את השבוע כולו (ראשון–שבת).
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </main>
    </>
  )
}

function WeekGrid({
  weeks, monthlySet, onToggle, busy,
}: {
  weeks: Date[]
  monthlySet: Set<string>
  onToggle: (weekStart: Date) => void
  busy: boolean
}) {
  // Group weeks by their starting month for nicer scanning.
  const groups = useMemo(() => {
    const out = new Map<string, Date[]>()
    for (const w of weeks) {
      const key = `${w.getFullYear()}-${w.getMonth()}`
      const arr = out.get(key) ?? []
      arr.push(w)
      out.set(key, arr)
    }
    return [...out.entries()]
  }, [weeks])

  return (
    <div className="flex flex-col gap-3">
      {groups.map(([key, list]) => {
        const sample = list[0]
        const label = `${HEBREW_MONTHS[sample.getMonth()]} ${sample.getFullYear()}`
        return (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="text-xs text-muted">{label}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {list.map((w) => {
                const iso = isoLocal(w)
                const isMonthly = monthlySet.has(iso)
                const end = new Date(w)
                end.setDate(w.getDate() + 6)
                const range = `${w.getDate()}/${w.getMonth() + 1} – ${end.getDate()}/${end.getMonth() + 1}`
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={busy}
                    onClick={() => onToggle(w)}
                    title={iso}
                    className={`flex flex-col items-center justify-center px-2 py-2 rounded-md border text-xs transition-colors ${
                      isMonthly
                        ? 'bg-danger/10 border-danger/40 text-danger'
                        : 'bg-success/10 border-success/40 text-success'
                    } ${busy ? 'opacity-50' : ''}`}
                  >
                    <span className="font-mono">{range}</span>
                    <span className="font-bold mt-0.5">{isMonthly ? 'חודשי' : 'שבועי'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
