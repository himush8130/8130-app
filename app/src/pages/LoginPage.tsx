import { useState, useRef, useCallback, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { Card, CardBody } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { hardReload } from '../lib/hardReload'
import { BUILD_TIME } from '../releaseNotes'
import { checkPinStatus, setPin, verifyPin } from '../lib/adminActions'
import type { Employee, EmployeePermissions } from '../types/db'

const BUILD_TIME_LABEL = new Date(BUILD_TIME).toLocaleString('he-IL', {
  year:   'numeric',
  month:  '2-digit',
  day:    '2-digit',
  hour:   '2-digit',
  minute: '2-digit',
})

const homeRouteByPermissions: Record<EmployeePermissions, string> = {
  technician:       '/technician',
  manager:          '/manager/dashboard',
  warehouse:        '/warehouse',
  commander_viewer: '/manager/dashboard',
}

type Stage = 'number' | 'pin-verify' | 'pin-setup'

function PinInput({ value, onChange, autoFocus }: {
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const digits = value.padEnd(4, ' ').slice(0, 4).split('')

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
    onChange(raw)
  }, [onChange])

  return (
    <div className="relative flex justify-center gap-3" dir="ltr">
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        autoFocus={autoFocus}
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
        autoComplete="one-time-code"
      />
      {digits.map((d, i) => (
        <div
          key={i}
          className={`w-12 h-14 flex items-center justify-center text-2xl font-bold rounded-xl border-2 transition-colors select-none ${
            focused && i === value.length
              ? 'border-primary ring-1 ring-primary'
              : 'border-border bg-card'
          }`}
        >
          {d.trim() ? '●' : ''}
        </div>
      ))}
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const setEmployee = useAuthStore((s) => s.setEmployee)
  const [stage, setStage] = useState<Stage>('number')
  const [pendingEmployee, setPendingEmployee] = useState<Employee | null>(null)
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [pin, setPinVal] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    await hardReload()
  }

  function completeLogin(emp: Employee) {
    setEmployee(emp)
    navigate(homeRouteByPermissions[emp.permissions], { replace: true })
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

    if (data.permissions !== 'manager' && data.permissions !== 'warehouse') {
      completeLogin(data)
      return
    }

    setPendingEmployee(data)
    setLoading(true)
    const res = await checkPinStatus(data.employee_number)
    setLoading(false)

    if (!res.ok) {
      setError('שגיאה בבדיקת סיסמה')
      return
    }

    if (res.has_pin) {
      setStage('pin-verify')
    } else {
      setStage('pin-setup')
    }
  }

  async function handlePinVerify(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (pin.length !== 4) { setError('יש להזין 4 ספרות'); return }

    setLoading(true)
    const res = await verifyPin(pendingEmployee!.employee_number, pin)
    setLoading(false)

    if (!res.ok) { setError('שגיאת מערכת'); return }
    if (!res.verified) {
      setError('סיסמה שגויה')
      setPinVal('')
      return
    }
    completeLogin(pendingEmployee!)
  }

  async function handlePinSetup(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (pin.length !== 4) { setError('יש להזין 4 ספרות'); return }
    if (pin !== confirmPin) {
      setError('הסיסמאות לא תואמות')
      setConfirmPin('')
      return
    }

    setLoading(true)
    const res = await setPin(pendingEmployee!.employee_number, pin)
    setLoading(false)

    if (!res.ok) { setError('שגיאה בשמירת סיסמה'); return }
    completeLogin(pendingEmployee!)
  }

  function goBack() {
    setStage('number')
    setPendingEmployee(null)
    setPinVal('')
    setConfirmPin('')
    setError(null)
  }

  useEffect(() => {
    if (stage === 'pin-verify' && pin.length === 4 && !loading) {
      handlePinVerify({ preventDefault: () => {} } as FormEvent)
    }
  }, [pin])

  useEffect(() => {
    if (stage === 'pin-setup' && pin.length === 4 && confirmPin.length === 4 && !loading) {
      handlePinSetup({ preventDefault: () => {} } as FormEvent)
    }
  }, [confirmPin])

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Shield protruding above the card */}
        <img
          src="/logo.png"
          alt="חימוש 8130"
          className="w-52 h-auto relative z-10 -mb-40 drop-shadow-lg"
        />

        <Card className="w-full relative overflow-hidden">
          {/* Decorative atmosphere lines */}
          <img
            src="/login-lines.png"
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-60"
          />

          <CardBody className="relative z-[1]">
            <ComponentBadge id={2001} />
            {/* Spacer for the protruding logo */}
            <div className="h-28" />

            <header className="text-center mb-6">
              <p className="text-sm text-muted">
                {stage === 'number' && 'כניסה למערכת'}
                {stage === 'pin-verify' && `שלום, ${pendingEmployee?.name}`}
                {stage === 'pin-setup' && 'הגדרת סיסמה ראשונית'}
              </p>
            </header>

            {stage === 'number' && (
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
            )}

            {stage === 'pin-verify' && (
              <form onSubmit={handlePinVerify} className="flex flex-col gap-4">
                <label className="text-sm text-center text-foreground font-medium">הזן סיסמה</label>
                <PinInput value={pin} onChange={setPinVal} autoFocus />
                {error && <p className="text-sm text-danger text-center">{error}</p>}
                <Button type="submit" disabled={loading || pin.length < 4}>
                  {loading ? 'מאמת...' : 'אישור'}
                </Button>
                <button type="button" onClick={goBack} className="text-xs text-muted hover:text-foreground text-center">
                  ← חזור
                </button>
              </form>
            )}

            {stage === 'pin-setup' && (
              <form onSubmit={handlePinSetup} className="flex flex-col gap-5">
                <p className="text-xs text-muted text-center">בחר סיסמה בת 4 ספרות לכניסה למערכת</p>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-foreground font-medium text-center">סיסמה</label>
                  <PinInput value={pin} onChange={setPinVal} autoFocus />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-foreground font-medium text-center">אימות סיסמה</label>
                  <PinInput value={confirmPin} onChange={setConfirmPin} />
                </div>
                {error && <p className="text-sm text-danger text-center">{error}</p>}
                <Button type="submit" disabled={loading || pin.length < 4 || confirmPin.length < 4}>
                  {loading ? 'שומר...' : 'שמור והיכנס'}
                </Button>
                <button type="button" onClick={goBack} className="text-xs text-muted hover:text-foreground text-center">
                  ← חזור
                </button>
              </form>
            )}

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
      </div>
    </main>
  )
}
