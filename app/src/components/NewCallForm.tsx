import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useVehicles } from '../hooks/useVehicles'
import { useAuthStore } from '../store/auth'
import { createCall } from '../lib/managerActions'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { SpecialtiesPicker } from './SpecialtiesPicker'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { TankSpecialty } from '../types/db'

interface Props {
  onCreated?:           () => void
  onCancel?:            () => void
  /** Pre-fill the vehicle number when opened from a vehicle's page. */
  initialVehicleNumber?: string
}

export function NewCallForm({ onCreated, onCancel, initialVehicleNumber }: Props) {
  const employee = useAuthStore((s) => s.employee)!
  const queryClient = useQueryClient()
  const { data: vehicles } = useVehicles()

  const [vehicleNumber, setVehicleNumber] = useState(initialVehicleNumber ?? '')
  const [description, setDescription]     = useState('')
  const [phone, setPhone]                 = useState(employee.phone ?? '')
  const [isDisabling, setIsDisabling]     = useState(false)
  const [specialties, setSpecialties]     = useState<TankSpecialty[]>([])
  const [busy, setBusy]                   = useState(false)
  const [result, setResult]               = useState<{ display_id?: string; anomalies?: Array<{ code: string; detail?: string }> } | null>(null)
  const [error, setError]                 = useState<string | null>(null)

  // Detect tank vehicle to surface the specialty picker.
  const matchedVehicle = useMemo(() => {
    return vehicles?.find((v) => v.vehicle_number === vehicleNumber.trim()) ?? null
  }, [vehicles, vehicleNumber])
  const isTank = matchedVehicle?.type_name === 'טנק'

  async function submit() {
    setError(null); setResult(null)
    if (!vehicleNumber.trim()) { setError('חובה להזין מספר רכב'); return }
    if (!description.trim())   { setError('חובה לתאר את התקלה'); return }

    setBusy(true)
    const res = await createCall(employee.employee_number, {
      vehicle_number: vehicleNumber.trim(),
      description:    description.trim(),
      reporter_phone: phone.trim() || null,
      is_disabling:   isDisabling,
      specialties,
    })
    setBusy(false)

    if (!res.ok) {
      setError(res.detail || res.error || 'שגיאה בפתיחת קריאה')
      return
    }

    queryClient.invalidateQueries({ queryKey: ['technician_calls'] })
    queryClient.invalidateQueries({ queryKey: ['service_calls'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle_history'] })

    setResult({ display_id: res.call?.display_id, anomalies: res.anomalies })
    setVehicleNumber(initialVehicleNumber ?? ''); setDescription(''); setIsDisabling(false); setSpecialties([])
    onCreated?.()
  }

  return (
    <Card>
      <ComponentBadge id={6010} />
      <CardHeader>
        <h3 className="text-sm font-semibold text-foreground">פתיחת תקלה חדשה</h3>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">מספר רכב</span>
          <input
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            inputMode="numeric"
            className="px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {matchedVehicle && (
            <span className="text-[11px] text-muted">
              {matchedVehicle.type_name}
              {matchedVehicle.sub_department && ` · ${matchedVehicle.sub_department}`}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">תיאור התקלה</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
        </label>

        <Input
          label="טלפון לחזרה"
          name="reporter_phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isDisabling}
            onChange={(e) => setIsDisabling(e.target.checked)}
          />
          <span className="text-sm text-foreground">תקלה משביתה — הכלי לא כשיר</span>
        </label>

        {isTank && (
          <SpecialtiesPicker value={specialties} onChange={setSpecialties} />
        )}

        <div className="flex gap-2 items-center pt-1">
          <Button onClick={submit} disabled={busy}>{busy ? 'שולח...' : 'פתח תקלה'}</Button>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} disabled={busy}>ביטול</Button>
          )}
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>

        {result && (
          <div className="text-xs text-success border border-success/40 bg-success/5 rounded-md p-2">
            ✓ נפתחה קריאה {result.display_id ?? ''}
            {result.anomalies && result.anomalies.length > 0 && (
              <span className="text-warning"> · חריגות: {result.anomalies.map((a) => a.code).join(', ')}</span>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
