import { useState, useRef, useEffect, type FormEvent } from 'react'
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

export function LoginPage() {
  const navigate = useNavigate()
  const setEmployee = useAuthStore((s) => s.setEmployee)
  const [stage, setStage] = useState<Stage>('number')
  const [pendingEmployee, setPendingEmployee] = useState<Employee | null>(null)
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [pin, setPin_] = useState(['', '', '', ''])
  const [confirmPin, setConfirmPin] = useState(['', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const confirmRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

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

    if (data.permissions !== 'manager') {
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

  function handlePinDigit(
    index: number,
    value: string,
    arr: string[],
    setArr: (v: string[]) => void,
    refs: React.RefObject<HTMLInputElement | null>[],
  ) {
    if (!/^\d?$/.test(value)) return
    const next = [...arr]
    next[index] = value
    setArr(next)
    if (value && index < 3) refs[index + 1].current?.focus()
  }

  function handlePinKeyDown(
    index: number,
    e: React.KeyboardEvent,
    arr: string[],
    setArr: (v: string[]) => void,
    refs: React.RefObject<HTMLInputElement | null>[],
  ) {
    if (e.key === 'Backspace' && !arr[index] && index > 0) {
      const next = [...arr]
      next[index - 1] = ''
      setArr(next)
      refs[index - 1].current?.focus()
    }
  }

  async function handlePinVerify(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const code = pin.join('')
    if (code.length !== 4) { setError('יש להזין 4 ספרות'); return }

    setLoading(true)
    const res = await verifyPin(pendingEmployee!.employee_number, code)
    setLoading(false)

    if (!res.ok) { setError('שגיאת מערכת'); return }
    if (!res.verified) {
      setError('סיסמה שגויה')
      setPin_(['', '', '', ''])
      pinRefs[0].current?.focus()
      return
    }
    completeLogin(pendingEmployee!)
  }

  async function handlePinSetup(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const code = pin.join('')
    const confirm = confirmPin.join('')
    if (code.length !== 4) { setError('יש להזין 4 ספרות'); return }
    if (code !== confirm) {
      setError('הסיסמאות לא תואמות')
      setConfirmPin(['', '', '', ''])
      confirmRefs[0].current?.focus()
      return
    }

    setLoading(true)
    const res = await setPin(pendingEmployee!.employee_number, code)
    setLoading(false)

    if (!res.ok) { setError('שגיאה בשמירת סיסמה'); return }
    completeLogin(pendingEmployee!)
  }

  function goBack() {
    setStage('number')
    setPendingEmployee(null)
    setPin_(['', '', '', ''])
    setConfirmPin(['', '', '', ''])
    setError(null)
  }

  useEffect(() => {
    if (stage === 'pin-verify') pinRefs[0].current?.focus()
    if (stage === 'pin-setup') pinRefs[0].current?.focus()
  }, [stage])

  function PinRow({
    value, setValue, refs, autoFocus,
  }: {
    value: string[]; setValue: (v: string[]) => void;
    refs: React.RefObject<HTMLInputElement | null>[]; autoFocus?: boolean
  }) {
    return (
      <div className="flex justify-center gap-3" dir="ltr">
        {value.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="password"
            inputMode="numeric"
            maxLength={1}
            autoFocus={autoFocus && i === 0}
            value={d}
            onChange={(e) => handlePinDigit(i, e.target.value, value, setValue, refs)}
            onKeyDown={(e) => handlePinKeyDown(i, e, value, setValue, refs)}
            className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-border bg-card text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
        ))}
      </div>
    )
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
              <PinRow value={pin} setValue={setPin_} refs={pinRefs} autoFocus />
              {error && <p className="text-sm text-danger text-center">{error}</p>}
              <Button type="submit" disabled={loading}>
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
                <PinRow value={pin} setValue={setPin_} refs={pinRefs} autoFocus />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-foreground font-medium text-center">אימות סיסמה</label>
                <PinRow value={confirmPin} setValue={setConfirmPin} refs={confirmRefs} />
              </div>
              {error && <p className="text-sm text-danger text-center">{error}</p>}
              <Button type="submit" disabled={loading}>
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
    </main>
  )
}
