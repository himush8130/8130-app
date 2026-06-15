import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { Card, CardBody } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { hardReload } from '../lib/hardReload'
import { BUILD_TIME } from '../releaseNotes'
import type { Employee, EmployeePermissions } from '../types/db'

const BUILD_TIME_LABEL = new Date(BUILD_TIME).toLocaleString('he-IL', {
  year:   'numeric',
  month:  '2-digit',
  day:    '2-digit',
  hour:   '2-digit',
  minute: '2-digit',
})

const homeRouteByPermissions: Record<EmployeePermissions, string> = {
  // Technicians land on the vehicle book; the dedicated /technician
  // page stays reachable from the header view switcher.
  technician: '/manager/vehicles',
  manager:    '/manager',
  warehouse:  '/warehouse',
  commander_viewer: '/manager/dashboard',
}

export function LoginPage() {
  const navigate = useNavigate()
  const setEmployee = useAuthStore((s) => s.setEmployee)
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    await hardReload()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const num = parseInt(employeeNumber, 10)
    if (Number.isNaN(num)) {
      setError('מספר אישי לא תקין')
      return
    }

    setLoading(true)
    const { data, error: dbError } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_number', num)
      .maybeSingle<Employee>()
    setLoading(false)

    if (dbError) {
      setError('שגיאת מערכת — נסה שוב')
      return
    }
    if (!data) {
      setError('מספר אישי לא נמצא')
      return
    }

    setEmployee(data)
    navigate(homeRouteByPermissions[data.permissions], { replace: true })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface p-4">
      <Card className="w-full max-w-sm">
        <CardBody>
          <ComponentBadge id={2001} />
          <header className="text-center mb-6 flex flex-col items-center gap-3">
            <img
              src="/logo.png"
              alt="חימוש 8130"
              className="w-40 h-auto rounded-md bg-black p-2"
            />
            <p className="text-sm text-muted">כניסה למערכת</p>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="מספר אישי"
              name="employeeNumber"
              type="number"
              inputMode="numeric"
              autoFocus
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              error={error ?? undefined}
            />

            <Button type="submit" disabled={loading}>
              {loading ? 'מתחבר...' : 'כניסה'}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="רענן נתונים ובדוק עדכון לאפליקציה"
              title="רענן נתונים ובדוק עדכון לאפליקציה"
              className="text-base text-muted hover:text-foreground border border-border rounded-md w-7 h-7 inline-flex items-center justify-center disabled:opacity-50"
            >
              ⟳
            </button>
            <span className="text-xs text-muted font-mono" dir="ltr">{BUILD_TIME_LABEL}</span>
          </div>
        </CardBody>
      </Card>
    </main>
  )
}
