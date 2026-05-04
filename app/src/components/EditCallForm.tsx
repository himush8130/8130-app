import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useVehicles } from '../hooks/useVehicles'
import { useAuthStore } from '../store/auth'
import { editCall } from '../lib/managerActions'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { SpecialtiesPicker } from './SpecialtiesPicker'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { ServiceCall, TankSpecialty } from '../types/db'

export function EditCallForm({
  call, onSaved, onCancel,
}: { call: ServiceCall; onSaved: () => void; onCancel: () => void }) {
  const employee = useAuthStore((s) => s.employee)!
  const queryClient = useQueryClient()
  const { data: vehicles } = useVehicles()

  const [vehicleNumber, setVehicleNumber] = useState(call.vehicle_number ?? '')
  const [description, setDescription]     = useState(call.description ?? '')
  const [phone, setPhone]                 = useState(call.reporter_phone ?? '')
  const [isDisabling, setIsDisabling]     = useState(call.is_disabling)
  const [specialties, setSpecialties]     = useState<TankSpecialty[]>(call.specialties ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matchedVehicle = useMemo(() => {
    return vehicles?.find((v) => v.vehicle_number === vehicleNumber.trim()) ?? null
  }, [vehicles, vehicleNumber])
  const isTank = matchedVehicle?.type_name === 'טנק'

  async function save() {
    setError(null); setBusy(true)
    const res = await editCall(employee.employee_number, call.id, {
      vehicle_number: vehicleNumber.trim() || null,
      description:    description.trim() || null,
      reporter_phone: phone.trim() || null,
      is_disabling:   isDisabling,
      specialties,
    })
    setBusy(false)
    if (!res.ok) { setError(res.detail || res.error || 'שגיאה'); return }
    queryClient.invalidateQueries({ queryKey: ['call', call.id] })
    queryClient.invalidateQueries({ queryKey: ['service_calls'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle_history'] })
    queryClient.invalidateQueries({ queryKey: ['technician_calls'] })
    onSaved()
  }

  return (
    <Card>
      <ComponentBadge id={5015} />
      <CardHeader>
        <h3 className="text-sm font-semibold text-foreground">עריכת קריאה {call.display_id}</h3>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">מספר רכב</span>
          <input
            list="vehicle-options-edit"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <datalist id="vehicle-options-edit">
            {vehicles?.map((v) => (
              <option key={v.vehicle_number} value={v.vehicle_number}>
                {v.type_name}{v.sub_department ? ` · ${v.sub_department}` : ''}
              </option>
            ))}
          </datalist>
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
          name="edit_phone"
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
          <span className="text-sm text-foreground">תקלה משביתה</span>
        </label>

        {isTank && (
          <SpecialtiesPicker value={specialties} onChange={setSpecialties} />
        )}

        <div className="flex gap-2 items-center pt-1">
          <Button onClick={save} disabled={busy}>{busy ? 'שומר...' : 'שמור שינויים'}</Button>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>ביטול</Button>
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>
      </CardBody>
    </Card>
  )
}
