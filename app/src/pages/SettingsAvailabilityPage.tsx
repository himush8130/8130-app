import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useEmployees } from '../hooks/useEmployees'
import { useEmployeeAvailability } from '../hooks/useAvailability'
import { useAuthStore } from '../store/auth'
import { setEmployeeAvailability } from '../lib/adminActions'
import { AppHeader } from '../components/AppHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

const HEBREW_DAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

export function SettingsAvailabilityPage() {
  const { data: employees } = useEmployees()
  const employee = useAuthStore((s) => s.employee)!
  const queryClient = useQueryClient()
  const [selectedNum, setSelectedNum] = useState<number | null>(null)
  const [filter, setFilter] = useState('')

  const filteredEmployees = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q || !employees) return employees ?? []
    return employees.filter((e) =>
      e.name.toLowerCase().includes(q) || String(e.employee_number).includes(q),
    )
  }, [employees, filter])

  const selectedEmp = employees?.find((e) => e.employee_number === selectedNum) ?? null

  const { data: avail } = useEmployeeAvailability(selectedNum)
  const unavailableSet = useMemo(() => new Set((avail ?? []).map((r) => r.date)), [avail])

  // 30-day window from today.
  const days = useMemo(() => {
    const out: Date[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      out.push(d)
    }
    return out
  }, [])

  async function toggle(d: Date) {
    if (selectedNum == null) return
    const iso = d.toISOString().slice(0, 10)
    const wasAvailable = !unavailableSet.has(iso)
    // Toggle: if currently available → mark unavailable; vice versa.
    await setEmployeeAvailability(employee.employee_number, selectedNum, iso, wasAvailable ? false : true)
    queryClient.invalidateQueries({ queryKey: ['availability', selectedNum] })
  }

  return (
    <>
      <AppHeader subtitle="הגדרות · זמינות עובדים" />
      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-3 pb-24">
        <Link to="/manager" className="text-sm text-primary self-start">→ חזור לפאנל</Link>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">בחר עובד</h3>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <Input
              label="חיפוש (שם / מספר אישי)"
              name="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-60 overflow-y-auto">
              {filteredEmployees.map((e) => (
                <button
                  key={e.employee_number}
                  type="button"
                  onClick={() => setSelectedNum(e.employee_number)}
                  className={`text-start text-sm px-3 py-2 rounded-md border transition-colors ${
                    selectedNum === e.employee_number
                      ? 'bg-primary text-primary-fg border-primary'
                      : 'bg-card text-foreground border-border hover:bg-muted-surface'
                  }`}
                >
                  <div className="truncate">{e.name}</div>
                  <div className="text-[11px] opacity-70 font-mono">{e.employee_number}</div>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        {selectedEmp && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">
                  זמינות 30 הימים הבאים — {selectedEmp.name}
                </h3>
                <span className="text-xs text-muted">לחץ על יום כדי להחליף בין זמין ולא זמין</span>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-7 gap-1.5">
                {days.map((d) => {
                  const iso = d.toISOString().slice(0, 10)
                  const isUnavail = unavailableSet.has(iso)
                  const dayLabel  = HEBREW_DAYS[d.getDay()]
                  const dateLabel = `${d.getDate()}/${d.getMonth() + 1}`
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => toggle(d)}
                      title={iso}
                      className={`flex flex-col items-center justify-center px-2 py-2 rounded-md border text-xs transition-colors ${
                        isUnavail
                          ? 'bg-danger/10 border-danger/40 text-danger'
                          : 'bg-success/10 border-success/40 text-success'
                      }`}
                    >
                      <span className="opacity-70">יום {dayLabel}</span>
                      <span className="font-mono">{dateLabel}</span>
                      <span className="font-bold mt-0.5">{isUnavail ? 'X' : 'V'}</span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 text-xs text-muted">
                ירוק = זמין, אדום = לא זמין. הסרת הסימון האדום שווה ל"זמין".
              </div>
            </CardBody>
          </Card>
        )}

        {!selectedEmp && (
          <p className="text-sm text-muted text-center py-4">בחר עובד מהרשימה כדי לערוך את הזמינות שלו.</p>
        )}
      </main>
    </>
  )
}
