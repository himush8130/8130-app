import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { setTankReading } from '../lib/adminActions'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import type { Vehicle } from '../types/db'

/** Inline editor for the technician to file the current engine-hours
 *  + kilometers reading on a tank. Renders nothing for non-tanks. */
export function TankReadingEditor({ vehicle, onSaved }: { vehicle: Vehicle; onSaved?: () => void }) {
  const employee = useAuthStore((s) => s.employee)
  const queryClient = useQueryClient()
  const [hours, setHours] = useState(vehicle.current_engine_hours != null ? String(vehicle.current_engine_hours) : '')
  const [km, setKm]       = useState(vehicle.current_kilometers   != null ? String(vehicle.current_kilometers)   : '')
  const [busy, setBusy]   = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setHours(vehicle.current_engine_hours != null ? String(vehicle.current_engine_hours) : '')
    setKm(vehicle.current_kilometers   != null ? String(vehicle.current_kilometers)   : '')
  }, [vehicle.current_engine_hours, vehicle.current_kilometers])

  if (vehicle.type_name !== 'טנק' || !employee) return null

  const hoursChanged = hours.trim() !== (vehicle.current_engine_hours != null ? String(vehicle.current_engine_hours) : '')
  const kmChanged    = km.trim()    !== (vehicle.current_kilometers   != null ? String(vehicle.current_kilometers)   : '')
  const dirty = hoursChanged || kmChanged

  async function save() {
    setError(null); setBusy(true)
    const payload: { current_engine_hours?: number | null; current_kilometers?: number | null } = {}
    if (hoursChanged) payload.current_engine_hours = hours.trim() === '' ? null : parseInt(hours, 10)
    if (kmChanged)    payload.current_kilometers   = km.trim()    === '' ? null : parseInt(km, 10)
    const res = await setTankReading(employee!.employee_number, vehicle.vehicle_number, payload)
    setBusy(false)
    if (!res.ok) { setError('שמירה נכשלה'); return }
    setSavedAt(Date.now())
    setTimeout(() => setSavedAt(null), 1500)
    queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle_history', vehicle.vehicle_number] })
    onSaved?.()
  }

  return (
    <div className="border-t border-border pt-3 mt-3 flex flex-col gap-2">
      <div className="text-xs text-muted">קריאה נוכחית</div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="שעות מנוע"
          name={`hours-${vehicle.vehicle_number}`}
          type="number"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
        <Input
          label="קילומטר"
          name={`km-${vehicle.vehicle_number}`}
          type="number"
          value={km}
          onChange={(e) => setKm(e.target.value)}
        />
      </div>
      <div className="flex gap-2 items-center">
        <Button onClick={save} disabled={busy || !dirty} className="text-xs px-3 py-1">
          {busy ? 'שומר...' : savedAt ? '✓ נשמר' : 'שמור'}
        </Button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </div>
  )
}
