import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useEmployees } from '../hooks/useEmployees'
import { useProfessions } from '../hooks/useProfessions'
import { useAuthStore } from '../store/auth'
import {
  createEmployee, updateEmployee, deleteEmployee, resetPin,
} from '../lib/adminActions'
import { AppHeader } from '../components/AppHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import type { Employee, EmployeePermissions, TankSpecialty } from '../types/db'
import { TANK_SPECIALTIES } from '../types/db'

const PERMS: EmployeePermissions[] = ['technician', 'manager', 'warehouse', 'commander_viewer']
const PERM_LABEL: Record<EmployeePermissions, string> = {
  technician: 'טכנאי', manager: 'מנהל', warehouse: 'מחסנאי', commander_viewer: 'מפקד צופה',
}

export function SettingsEmployeesPage() {
  const { data: employees } = useEmployees()
  const { data: professions } = useProfessions()
  const employee = useAuthStore((s) => s.employee)!
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState('')

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['employees'] })
    queryClient.invalidateQueries({ queryKey: ['professions'] })
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q || !employees) return employees ?? []
    return employees.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      String(e.employee_number).includes(q) ||
      (e.phone ?? '').includes(q) ||
      (e.profession_name ?? '').toLowerCase().includes(q),
    )
  }, [employees, filter])

  const profOptions = professions?.map((p) => p.name) ?? []

  return (
    <>
      <AppHeader subtitle="הגדרות · עובדים" />
      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-3 pb-24">
        <Link to="/manager" className="text-sm text-primary self-start">→ חזור לפאנל</Link>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">
                עובדים{employees ? ` · ${employees.length}` : ''}
              </h3>
              {!adding && (
                <Button onClick={() => setAdding(true)}>+ הוסף עובד</Button>
              )}
            </div>
          </CardHeader>

          {adding && (
            <CardBody className="border-b border-border bg-muted-surface">
              <AddRow
                profs={profOptions}
                managerNum={employee.employee_number}
                onDone={() => { setAdding(false); refresh() }}
                onCancel={() => setAdding(false)}
              />
            </CardBody>
          )}

          <CardBody className="border-b border-border">
            <Input
              label="חיפוש (שם / מספר אישי / טלפון / מקצוע)"
              name="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </CardBody>

          <CardBody className="p-0">
            {!employees && <p className="text-sm text-muted text-center py-4">טוען...</p>}
            {employees && filtered.length === 0 && (
              <p className="text-sm text-muted text-center py-4">לא נמצאו עובדים</p>
            )}
            {filtered.map((e) => (
              <EmployeeRow
                key={e.employee_number}
                emp={e}
                profs={profOptions}
                managerNum={employee.employee_number}
                onChange={refresh}
              />
            ))}
          </CardBody>
        </Card>
      </main>
    </>
  )
}

// ---------- Add row ----------

function AddRow({
  profs, managerNum, onDone, onCancel,
}: {
  profs: string[]
  managerNum: number
  onDone: () => void
  onCancel: () => void
}) {
  const [num, setNum] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [prof, setProf] = useState('')
  const [perms, setPerms] = useState<EmployeePermissions>('technician')
  const [specialty, setSpecialty] = useState<TankSpecialty | ''>('')
  const [excludeFromReport, setExcludeFromReport] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    const n = parseInt(num, 10)
    if (Number.isNaN(n) || n <= 0)  { setError('מספר אישי לא תקין'); return }
    if (!name.trim())                { setError('שם חובה'); return }
    setBusy(true)
    const res = await createEmployee(managerNum, {
      employee_number: n,
      name: name.trim(),
      phone: phone.trim() || null,
      profession_name: prof.trim() || null,
      permissions: perms,
      specialty: specialty || null,
      exclude_from_availability_report: excludeFromReport,
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error === 'employee_number_taken' ? 'מספר אישי כבר קיים' : 'שגיאה')
      return
    }
    onDone()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input label="מספר אישי"  name="num"   value={num}   onChange={(e) => setNum(e.target.value)} type="number" autoFocus />
        <Input label="שם"          name="name"  value={name}  onChange={(e) => setName(e.target.value)} />
        <Input label="טלפון"       name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <ProfSelect label="מקצוע" value={prof} options={profs} onChange={setProf} />
        <PermsSelect value={perms} onChange={setPerms} />
        <SpecialtySelect value={specialty} onChange={setSpecialty} />
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={excludeFromReport}
          onChange={(e) => setExcludeFromReport(e.target.checked)}
        />
        החרג מדוח זמינות
      </label>
      <div className="flex gap-2 items-center">
        <Button onClick={save} disabled={busy}>{busy ? 'שומר...' : 'הוסף'}</Button>
        <Button variant="ghost" onClick={onCancel}>ביטול</Button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </div>
  )
}

// ---------- Single row ----------

function EmployeeRow({
  emp, profs, managerNum, onChange,
}: {
  emp: Employee
  profs: string[]
  managerNum: number
  onChange: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(emp.name)
  const [phone, setPhone] = useState(emp.phone ?? '')
  const [prof, setProf] = useState(emp.profession_name ?? '')
  const [perms, setPerms] = useState<EmployeePermissions>(emp.permissions)
  const [specialty, setSpecialty] = useState<TankSpecialty | ''>(emp.specialty ?? '')
  const [excludeFromReport, setExcludeFromReport] = useState(emp.exclude_from_availability_report ?? false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pinReset, setPinReset] = useState(false)

  async function handleResetPin() {
    setBusy(true)
    const res = await resetPin(managerNum, emp.employee_number)
    setBusy(false)
    if (!res.ok) { setError('שגיאה באיפוס סיסמה'); return }
    setPinReset(true)
    setTimeout(() => setPinReset(false), 3000)
  }

  async function save() {
    setError(null); setBusy(true)
    const res = await updateEmployee(managerNum, emp.employee_number, {
      name: name.trim(),
      phone: phone.trim() || null,
      profession_name: prof.trim() || null,
      permissions: perms,
      specialty: specialty || null,
      exclude_from_availability_report: excludeFromReport,
    })
    setBusy(false)
    if (!res.ok) { setError('שגיאה'); return }
    setEditing(false)
    onChange()
  }

  async function remove() {
    setError(null); setBusy(true)
    const res = await deleteEmployee(managerNum, emp.employee_number)
    setBusy(false)
    if (!res.ok) {
      if (res.error === 'in_use') {
        const ref: any = res
        setError(`לא ניתן למחוק — מקושר ל-${ref.feedback_notes ?? 0} הערות, ${ref.part_withdrawals ?? 0} יציאות`)
      } else {
        setError('שגיאה')
      }
      setConfirmDelete(false)
      return
    }
    onChange()
  }

  return (
    <div className="px-4 py-3 border-b border-border last:border-0">
      {!editing ? (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <span className="font-mono text-xs text-muted">{emp.employee_number}</span>
            <span className="text-sm font-medium text-foreground">{emp.name}</span>
            <Badge tone="neutral">{PERM_LABEL[emp.permissions]}</Badge>
            {emp.profession_name && (
              <span className="text-xs text-muted">· {emp.profession_name}</span>
            )}
            {emp.specialty && (
              <Badge tone="info">{emp.specialty}</Badge>
            )}
            {emp.phone && (
              <span className="text-xs text-muted font-mono" dir="ltr">· {emp.phone}</span>
            )}
            {emp.exclude_from_availability_report && (
              <Badge tone="warning">לא בדוח</Badge>
            )}
          </div>
          {!confirmDelete && (
            <div className="flex gap-1 items-center">
              {emp.permissions === 'manager' && (
                pinReset
                  ? <span className="text-xs text-success">אופסה</span>
                  : <Button variant="ghost" onClick={handleResetPin} disabled={busy}>אפס סיסמה</Button>
              )}
              <Button variant="secondary" onClick={() => setEditing(true)}>ערוך</Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(true)}>מחק</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="text-xs text-muted self-end pb-2">
              מס׳ עובד: <span className="font-mono">{emp.employee_number}</span>
            </div>
            <Input label="שם" name={`n-${emp.employee_number}`} value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="טלפון" name={`p-${emp.employee_number}`} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <ProfSelect label="מקצוע" value={prof} options={profs} onChange={setProf} />
            <PermsSelect value={perms} onChange={setPerms} />
            <SpecialtySelect value={specialty} onChange={setSpecialty} />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={excludeFromReport}
              onChange={(e) => setExcludeFromReport(e.target.checked)}
            />
            החרג מדוח זמינות
          </label>
          <div className="flex gap-2 items-center">
            <Button onClick={save} disabled={busy}>{busy ? 'שומר...' : 'שמור'}</Button>
            <Button variant="ghost" onClick={() => { setEditing(false); setName(emp.name); setPhone(emp.phone ?? ''); setProf(emp.profession_name ?? ''); setPerms(emp.permissions); setSpecialty(emp.specialty ?? ''); setExcludeFromReport(emp.exclude_from_availability_report ?? false) }}>ביטול</Button>
            {error && <span className="text-xs text-danger">{error}</span>}
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="flex flex-col gap-2 mt-3 p-2 bg-danger/5 rounded-md">
          <p className="text-sm">למחוק את {emp.name} ({emp.employee_number})?</p>
          <div className="flex gap-2">
            <Button onClick={remove} disabled={busy}>{busy ? '...' : 'אשר מחיקה'}</Button>
            <Button variant="ghost" onClick={() => { setConfirmDelete(false); setError(null) }}>ביטול</Button>
            {error && <span className="text-xs text-danger">{error}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- helpers ----------

function ProfSelect({
  label, value, options, onChange,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">— ללא —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

function PermsSelect({
  value, onChange,
}: { value: EmployeePermissions; onChange: (v: EmployeePermissions) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-foreground">הרשאה</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as EmployeePermissions)}
        className="px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {PERMS.map((p) => <option key={p} value={p}>{PERM_LABEL[p]}</option>)}
      </select>
    </label>
  )
}

function SpecialtySelect({
  value, onChange,
}: { value: TankSpecialty | ''; onChange: (v: TankSpecialty | '') => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-foreground">התמחות (טנקים)</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TankSpecialty | '')}
        className="px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">— ללא —</option>
        {TANK_SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </label>
  )
}
