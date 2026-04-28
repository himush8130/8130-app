import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardBody } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { useAuthStore } from '../store/auth'
import {
  resolveAnomalyFixVehicle,
  resolveAnomalySetProfession,
  cancelCall,
} from '../lib/managerActions'
import type { ServiceCall, Profession } from '../types/db'

interface Props {
  call: ServiceCall
  professions: Profession[]
}

type Mode = 'idle' | 'fix-vehicle' | 'set-profession'

export function AnomalyResolver({ call, professions }: Props) {
  const employee = useAuthStore((s) => s.employee)!
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vehicleNumber, setVehicleNumber] = useState(call.vehicle_number ?? '')
  const [professionId, setProfessionId] = useState<number>(professions[0]?.id ?? 0)

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['anomaly_calls'] })
    queryClient.invalidateQueries({ queryKey: ['manager_overview'] })
  }

  async function handleFixVehicle() {
    setError(null)
    setBusy(true)
    const res = await resolveAnomalyFixVehicle(employee.employee_number, call.id, vehicleNumber.trim())
    setBusy(false)
    if (!res.ok) {
      setError(res.error === 'vehicle_still_unknown'
        ? 'מספר רכב עדיין לא קיים במערכת'
        : 'שגיאה בעדכון')
      return
    }
    refresh()
  }

  async function handleSetProfession() {
    setError(null)
    setBusy(true)
    const res = await resolveAnomalySetProfession(employee.employee_number, call.id, professionId)
    setBusy(false)
    if (!res.ok) {
      setError('שגיאה בעדכון')
      return
    }
    refresh()
  }

  async function handleCancel() {
    setError(null)
    setBusy(true)
    const res = await cancelCall(employee.employee_number, call.id)
    setBusy(false)
    if (!res.ok) {
      setError('שגיאה בעדכון')
      return
    }
    refresh()
  }

  const date = new Date(call.created_at).toLocaleDateString('he-IL')

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{call.display_id}</span>
              <Badge tone="danger">חריגה דחופה</Badge>
            </div>
            <div className="text-sm text-muted mt-1">
              {call.vehicle_number ?? '—'}
              {call.vehicle_name ? ` · ${call.vehicle_name}` : ''}
              {' · '}
              {date}
            </div>
          </div>
        </div>

        {call.description && (
          <p className="text-sm text-foreground mb-3">{call.description}</p>
        )}

        <ul className="text-xs text-muted list-disc me-5 mb-4">
          {call.anomaly_flags.map((a, i) => (
            <li key={i}>{a.code}{a.detail ? ` — ${a.detail}` : ''}</li>
          ))}
        </ul>

        {mode === 'idle' && (
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setMode('fix-vehicle')}>
              תקן מספר רכב
            </Button>
            <Button variant="secondary" onClick={() => setMode('set-profession')}>
              סווג למקצוע ידנית
            </Button>
            <Button variant="ghost" onClick={handleCancel} disabled={busy}>
              בטל קריאה
            </Button>
          </div>
        )}

        {mode === 'fix-vehicle' && (
          <div className="flex flex-col gap-3">
            <Input
              label="מספר רכב חדש"
              name="vehicle_number"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              error={error ?? undefined}
            />
            <div className="flex gap-2">
              <Button onClick={handleFixVehicle} disabled={busy}>
                {busy ? 'מעדכן...' : 'עדכן'}
              </Button>
              <Button variant="ghost" onClick={() => { setMode('idle'); setError(null) }}>
                ביטול
              </Button>
            </div>
          </div>
        )}

        {mode === 'set-profession' && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">בחר מקצוע</span>
              <select
                value={professionId}
                onChange={(e) => setProfessionId(parseInt(e.target.value, 10))}
                className="px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {professions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            {error && <span className="text-xs text-danger">{error}</span>}
            <div className="flex gap-2">
              <Button onClick={handleSetProfession} disabled={busy}>
                {busy ? 'מעדכן...' : 'אישור'}
              </Button>
              <Button variant="ghost" onClick={() => { setMode('idle'); setError(null) }}>
                ביטול
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
