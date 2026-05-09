import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { useVehicles } from '../hooks/useVehicles'
import { updateVehicleLocationDept } from '../lib/adminActions'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import type { Vehicle } from '../types/db'

interface Props {
  vehicle: Vehicle
  /** Optional invalidate hook for any extra query keys the caller cares about. */
  onSaved?: () => void
}

/**
 * Inline editor for vehicle.location (free text) and vehicle.department
 * (closed list — values come from the existing distinct departments
 * in the catalog). Available to every authenticated employee.
 */
export function VehicleLocationDeptEditor({ vehicle, onSaved }: Props) {
  const employee = useAuthStore((s) => s.employee)
  const queryClient = useQueryClient()
  const { data: allVehicles } = useVehicles()

  const [editing, setEditing] = useState(false)
  const [location, setLocation] = useState(vehicle.location ?? '')
  const [department, setDepartment] = useState(vehicle.department ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const departmentOptions = useMemo(() => {
    const s = new Set<string>()
    for (const v of allVehicles ?? []) {
      if (v.department) s.add(v.department)
    }
    if (vehicle.department) s.add(vehicle.department)
    return [...s].sort((a, b) => a.localeCompare(b, 'he'))
  }, [allVehicles, vehicle.department])

  async function save() {
    if (!employee) return
    setBusy(true); setError(null)
    const res = await updateVehicleLocationDept(employee.employee_number, vehicle.vehicle_number, {
      location:   location.trim() || null,
      department: department.trim() || null,
    })
    setBusy(false)
    if (!res.ok) { setError('שגיאה בעדכון'); return }
    queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle_history', vehicle.vehicle_number] })
    onSaved?.()
    setEditing(false)
  }

  function cancel() {
    setLocation(vehicle.location ?? '')
    setDepartment(vehicle.department ?? '')
    setError(null)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="text-sm text-muted flex items-center gap-2 flex-wrap">
        <span>
          <span className="text-xs">מיקום:</span>{' '}
          <span className="text-foreground">{vehicle.location || '—'}</span>
        </span>
        <span className="text-faint">·</span>
        <span>
          <span className="text-xs">מחלקה:</span>{' '}
          <span className="text-foreground">{vehicle.department || '—'}</span>
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-primary hover:underline"
        >
          ערוך
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 border border-border rounded-md p-3 bg-muted-surface/40">
      <Input
        label="מיקום"
        name={`loc-${vehicle.vehicle_number}`}
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="לדוגמה: דוגית"
      />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">מחלקה</span>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">— ללא —</option>
          {departmentOptions.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </label>
      <div className="flex gap-2 items-center">
        <Button onClick={save} disabled={busy} className="text-xs px-3 py-1">{busy ? 'שומר...' : 'שמור'}</Button>
        <Button variant="ghost" onClick={cancel} disabled={busy} className="text-xs px-3 py-1">ביטול</Button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </div>
  )
}
