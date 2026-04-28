import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { Card, CardBody } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { Employee, EmployeeRole } from '../types/db'

const roleHomeRoute: Record<EmployeeRole, string> = {
  technician: '/technician',
  manager:    '/manager',     // M4 — falls back to /login redirect for now
  warehouse:  '/warehouse',   // M5 — same
}

export function LoginPage() {
  const navigate = useNavigate()
  const setEmployee = useAuthStore((s) => s.setEmployee)
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const num = parseInt(employeeNumber, 10)
    if (Number.isNaN(num)) {
      setError('מספר עובד לא תקין')
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
      setError('מספר עובד לא נמצא')
      return
    }

    setEmployee(data)
    navigate(roleHomeRoute[data.role], { replace: true })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface p-4">
      <Card className="w-full max-w-sm">
        <CardBody>
          <ComponentBadge id={2001} />
          <header className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">8130 APP</h1>
            <p className="text-sm text-muted mt-1">כניסה למערכת</p>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="מספר עובד"
              name="employeeNumber"
              type="number"
              inputMode="numeric"
              autoFocus
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              error={error ?? undefined}
              hint="לדוגמה: 1003 / 1004 / 1005 (טכנאים), 1001 (מנהל), 1002 (מחסנאי)"
            />

            <Button type="submit" disabled={loading}>
              {loading ? 'מתחבר...' : 'כניסה'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </main>
  )
}
