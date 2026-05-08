import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useVehicles } from '../hooks/useVehicles'
import { useProfessions } from '../hooks/useProfessions'
import { useAuthStore } from '../store/auth'
import {
  createVehicle, updateVehicle, deleteVehicle,
} from '../lib/adminActions'
import { AppHeader } from '../components/AppHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import type { Vehicle } from '../types/db'

export function SettingsVehiclesPage() {
  const { data: vehicles } = useVehicles()
  const { data: professions } = useProfessions()
  const employee = useAuthStore((s) => s.employee)!
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState('')

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['vehicles'] })
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q || !vehicles) return vehicles ?? []
    return vehicles.filter((v) =>
      v.vehicle_number.toLowerCase().includes(q) ||
      v.type_name.toLowerCase().includes(q) ||
      (v.department ?? '').toLowerCase().includes(q) ||
      (v.sub_department ?? '').toLowerCase().includes(q),
    )
  }, [vehicles, filter])

  const profOptions = professions?.map((p) => p.name) ?? []

  return (
    <>
      <AppHeader subtitle="הגדרות · כלים" />
      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-3 pb-24">
        <Link to="/manager" className="text-sm text-primary self-start">→ חזור לפאנל</Link>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">
                כלים{vehicles ? ` · ${vehicles.length}` : ''}
              </h3>
              {!adding && <Button onClick={() => setAdding(true)}>+ הוסף כלי</Button>}
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
              label="חיפוש (מספר כלי / מקצוע / מחלקה / תת מחלקה)"
              name="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </CardBody>

          <CardBody className="p-0">
            {!vehicles && <p className="text-sm text-muted text-center py-4">טוען...</p>}
            {vehicles && filtered.length === 0 && (
              <p className="text-sm text-muted text-center py-4">לא נמצאו כלים</p>
            )}
            {filtered.map((v) => (
              <VehicleRow
                key={v.vehicle_number}
                vehicle={v}
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
  const [type_name, setType] = useState(profs[0] ?? '')
  const [department, setDept] = useState('')
  const [sub_department, setSub] = useState('')
  const [location, setLocation] = useState('')
  const [model, setModel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    if (!num.trim()) { setError('מספר כלי חובה'); return }
    if (!type_name.trim()) { setError('מקצוע חובה'); return }
    setBusy(true)
    const res = await createVehicle(managerNum, {
      vehicle_number: num.trim(),
      type_name: type_name.trim(),
      department: department.trim() || null,
      sub_department: sub_department.trim() || null,
      location: location.trim() || null,
      model: model.trim() || null,
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error === 'vehicle_number_taken' ? 'מספר כלי כבר קיים' : 'שגיאה')
      return
    }
    onDone()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="מספר כלי"  name="num"  value={num}  onChange={(e) => setNum(e.target.value)} autoFocus />
        <ProfSelect label="מקצוע" value={type_name} options={profs} onChange={setType} required />
        <Input label="מחלקה" name="dept"  value={department}     onChange={(e) => setDept(e.target.value)} />
        <Input label="תת מחלקה" name="sub" value={sub_department} onChange={(e) => setSub(e.target.value)} />
        <Input label="מיקום"   name="loc"  value={location}       onChange={(e) => setLocation(e.target.value)} />
        <Input label="סוג הכלי (דגם)" name="model" value={model} onChange={(e) => setModel(e.target.value)} />
      </div>
      <div className="flex gap-2 items-center">
        <Button onClick={save} disabled={busy}>{busy ? 'שומר...' : 'הוסף'}</Button>
        <Button variant="ghost" onClick={onCancel}>ביטול</Button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </div>
  )
}

// ---------- Single row ----------

function VehicleRow({
  vehicle, profs, managerNum, onChange,
}: {
  vehicle: Vehicle
  profs: string[]
  managerNum: number
  onChange: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [type_name, setType] = useState(vehicle.type_name)
  const [department, setDept] = useState(vehicle.department ?? '')
  const [sub_department, setSub] = useState(vehicle.sub_department ?? '')
  const [location, setLocation] = useState(vehicle.location ?? '')
  const [model, setModel] = useState(vehicle.model ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function save() {
    setError(null)
    if (!type_name.trim()) { setError('מקצוע חובה'); return }
    setBusy(true)
    const res = await updateVehicle(managerNum, vehicle.vehicle_number, {
      type_name: type_name.trim(),
      department: department.trim() || null,
      sub_department: sub_department.trim() || null,
      location: location.trim() || null,
      model: model.trim() || null,
    })
    setBusy(false)
    if (!res.ok) { setError('שגיאה'); return }
    setEditing(false)
    onChange()
  }

  async function remove() {
    setError(null); setBusy(true)
    const res = await deleteVehicle(managerNum, vehicle.vehicle_number)
    setBusy(false)
    if (!res.ok) { setError('שגיאה'); setConfirmDelete(false); return }
    onChange()
  }

  return (
    <div className="px-4 py-3 border-b border-border last:border-0">
      {!editing ? (
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-muted">{vehicle.vehicle_number}</span>
              <Badge tone="neutral">{vehicle.type_name}</Badge>
            </div>
            {(vehicle.department || vehicle.sub_department || vehicle.location) && (
              <div className="text-xs text-muted truncate">
                {vehicle.department}
                {vehicle.sub_department && ` · ${vehicle.sub_department}`}
                {vehicle.location && ` · ${vehicle.location}`}
              </div>
            )}
          </div>
          {!confirmDelete && (
            <div className="flex gap-1 shrink-0">
              <Button variant="secondary" onClick={() => setEditing(true)} className="text-xs px-3 py-1">ערוך</Button>
              <Button variant="ghost"     onClick={() => setConfirmDelete(true)} className="text-xs px-3 py-1">מחק</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="text-xs text-muted self-end pb-2">
              מספר כלי: <span className="font-mono">{vehicle.vehicle_number}</span>
            </div>
            <ProfSelect label="מקצוע" value={type_name} options={profs} onChange={setType} required />
            <Input label="מחלקה" name={`d-${vehicle.vehicle_number}`} value={department} onChange={(e) => setDept(e.target.value)} />
            <Input label="תת מחלקה" name={`s-${vehicle.vehicle_number}`} value={sub_department} onChange={(e) => setSub(e.target.value)} />
            <Input label="מיקום" name={`l-${vehicle.vehicle_number}`} value={location} onChange={(e) => setLocation(e.target.value)} />
            <Input label="סוג הכלי (דגם)" name={`m-${vehicle.vehicle_number}`} value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={save} disabled={busy}>{busy ? 'שומר...' : 'שמור'}</Button>
            <Button variant="ghost" onClick={() => { setEditing(false); setType(vehicle.type_name); setDept(vehicle.department ?? ''); setSub(vehicle.sub_department ?? '') }}>ביטול</Button>
            {error && <span className="text-xs text-danger">{error}</span>}
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="flex flex-col gap-2 mt-3 p-2 bg-danger/5 rounded-md">
          <p className="text-sm">למחוק את {vehicle.vehicle_number}?</p>
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
  label, value, options, onChange, required,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-foreground">{label}{required && ' *'}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {!required && <option value="">— ללא —</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}
