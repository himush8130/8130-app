import { useEffect, useRef, useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useVehicles } from '../hooks/useVehicles'
import { useParts } from '../hooks/useParts'
import { useAuthStore } from '../store/auth'
import { supabase } from '../lib/supabase'
import { createCall } from '../lib/managerActions'
import { addRequiredPart, createPart } from '../lib/warehouseActions'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { SpecialtiesPicker } from './SpecialtiesPicker'
import { OrderClassPanel, type OrderClassPanelHandle } from './OrderClassPanel'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { TankSpecialty } from '../types/db'
import type { Part } from '../types/parts'

interface DraftPart {
  /** Stable client-side id for keys/removal. */
  key:        string
  /** Catalog part.id when picked from catalog; null for a fresh SKU. */
  partId:     string | null
  sku:        string
  name:       string
  quantity:   number
}

interface Props {
  onCreated?:           () => void
  onCancel?:            () => void
  /** Pre-fill the vehicle number when opened from a vehicle's page. */
  initialVehicleNumber?: string
}

export function NewCallForm({ onCreated, onCancel, initialVehicleNumber }: Props) {
  const employee = useAuthStore((s) => s.employee)!
  const setEmployee = useAuthStore((s) => s.setEmployee)
  const queryClient = useQueryClient()
  const { data: vehicles } = useVehicles()

  const { data: catalog } = useParts()

  const [vehicleNumber, setVehicleNumber] = useState(initialVehicleNumber ?? '')
  const [description, setDescription]     = useState('')
  const [phone, setPhone]                 = useState(employee.phone ?? '')

  // The auth-store copy of `employee` is whatever was persisted at
  // login. If the warehouse manager later filled in the phone on the
  // employees table, the cached value can lag. Re-fetch on mount so
  // the reporter-phone field is pre-populated whenever the DB has a
  // value — even if the user didn't log out and back in.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('employee_number', employee.employee_number)
        .maybeSingle()
      if (cancelled || !data) return
      if (data.phone && data.phone !== employee.phone) {
        setEmployee({ ...employee, phone: data.phone })
        setPhone((cur) => cur || data.phone)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [isDisabling, setIsDisabling]     = useState(false)
  const [specialties, setSpecialties]     = useState<TankSpecialty[]>([])
  const [drafts, setDrafts]               = useState<DraftPart[]>([])
  const [busy, setBusy]                   = useState(false)
  const [result, setResult]               = useState<{ display_id?: string; anomalies?: Array<{ code: string; detail?: string }>; partsAdded?: number; partsFailed?: number } | null>(null)
  const [error, setError]                 = useState<string | null>(null)
  const classPanelRef                     = useRef<OrderClassPanelHandle>(null)

  // Detect tank vehicle to surface the specialty picker.
  const matchedVehicle = useMemo(() => {
    return vehicles?.find((v) => v.vehicle_number === vehicleNumber.trim()) ?? null
  }, [vehicles, vehicleNumber])
  const isTank = matchedVehicle?.type_name === 'טנק'

  async function submit() {
    setError(null); setResult(null)
    if (!vehicleNumber.trim()) { setError('חובה להזין מספר כלי'); return }
    if (!description.trim())   { setError('חובה לתאר את התקלה'); return }

    setBusy(true)
    const res = await createCall(employee.employee_number, {
      vehicle_number: vehicleNumber.trim(),
      description:    description.trim(),
      reporter_phone: phone.trim() || null,
      is_disabling:   isDisabling,
      specialties,
    })

    if (!res.ok) {
      setBusy(false)
      setError(res.detail || res.error || 'שגיאה בפתיחת קריאה')
      return
    }

    const callId = res.call?.id
    let partsAdded  = 0
    let partsFailed = 0

    // If the user filled in the "הזמן כיתה" panel, persist it now
    // that we have a call_id to attach to.
    if (callId) {
      await classPanelRef.current?.saveIfFilled(callId)
    }

    if (callId && drafts.length > 0) {
      for (const d of drafts) {
        let partId: string | null = d.partId
        if (!partId) {
          const c: any = await createPart(employee.employee_number, { sku: d.sku, name: d.name, quantity: 0 })
          if (c.ok && c.part) partId = c.part.id as string
          else { partsFailed += 1; continue }
        }
        if (!partId) { partsFailed += 1; continue }
        const r = await addRequiredPart(employee.employee_number, callId, partId, d.quantity)
        if (r.ok) partsAdded += 1
        else      partsFailed += 1
      }
    }

    setBusy(false)
    queryClient.invalidateQueries({ queryKey: ['technician_calls'] })
    queryClient.invalidateQueries({ queryKey: ['service_calls'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle_history'] })
    queryClient.invalidateQueries({ queryKey: ['parts'] })
    queryClient.invalidateQueries({ queryKey: ['pending_parts_actions'] })
    queryClient.invalidateQueries({ queryKey: ['calls_parts_status'] })

    setResult({ display_id: res.call?.display_id, anomalies: res.anomalies, partsAdded, partsFailed })
    setVehicleNumber(initialVehicleNumber ?? '')
    setDescription(''); setIsDisabling(false); setSpecialties([]); setDrafts([])
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
          <span className="text-sm font-medium text-foreground">מספר כלי</span>
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

        <DraftPartsEditor
          catalog={catalog ?? []}
          drafts={drafts}
          onChange={setDrafts}
        />

        <OrderClassPanel
          ref={classPanelRef}
          callId={null}
          vehicleNumber={vehicleNumber.trim() || null}
          description={description}
          badgeId={6011}
        />

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
            {result.partsAdded != null && result.partsAdded > 0 && (
              <span> · {result.partsAdded} חלקים נוספו</span>
            )}
            {result.partsFailed != null && result.partsFailed > 0 && (
              <span className="text-danger"> · {result.partsFailed} חלקים נכשלו</span>
            )}
            {result.anomalies && result.anomalies.length > 0 && (
              <span className="text-warning"> · חריגות: {result.anomalies.map((a) => a.code).join(', ')}</span>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

// ---------- Optional draft parts ----------

function DraftPartsEditor({
  catalog, drafts, onChange,
}: {
  catalog: Part[]
  drafts:  DraftPart[]
  onChange: (next: DraftPart[]) => void
}) {
  const [skuQ, setSkuQ]   = useState('')
  const [nameQ, setNameQ] = useState('')
  const [qty, setQty]     = useState('1')
  const [picked, setPicked] = useState<Part | null>(null)

  const matches = useMemo(() => {
    const sku  = skuQ.trim().toLowerCase()
    const name = nameQ.trim().toLowerCase()
    if (!sku && !name) return []
    return catalog
      .filter((p) => (
        (!sku  || p.sku.toLowerCase().includes(sku)) &&
        (!name || p.name.toLowerCase().includes(name))
      ))
      .slice(0, 6)
  }, [catalog, skuQ, nameQ])

  const sku  = skuQ.trim()
  const name = nameQ.trim()
  const q    = parseInt(qty, 10)
  const qOk  = !Number.isNaN(q) && q > 0

  function pick(p: Part) {
    setPicked(p)
    setSkuQ(p.sku)
    setNameQ(p.name)
  }

  function reset() {
    setSkuQ(''); setNameQ(''); setQty('1'); setPicked(null)
  }

  function addExisting() {
    if (!picked || !qOk) return
    onChange([...drafts, {
      key: `e-${Date.now()}-${picked.id}`,
      partId: picked.id,
      sku:    picked.sku,
      name:   picked.name,
      quantity: q,
    }])
    reset()
  }

  function addNew() {
    if (!sku || !name || !qOk) return
    onChange([...drafts, {
      key: `n-${Date.now()}`,
      partId: null,
      sku, name,
      quantity: q,
    }])
    reset()
  }

  function remove(key: string) {
    onChange(drafts.filter((d) => d.key !== key))
  }

  const noMatch = !!sku && !!name && matches.length === 0 && !picked

  return (
    <div className="border border-border rounded-md p-3 flex flex-col gap-2 bg-muted-surface/40">
      <div className="text-sm font-medium text-foreground">חלקים נדרשים (אופציונלי)</div>

      {drafts.length > 0 && (
        <ul className="flex flex-col gap-1">
          {drafts.map((d) => (
            <li key={d.key} className="flex items-center justify-between gap-2 text-xs bg-card border border-border rounded px-2 py-1">
              <div className="truncate">
                <span className="text-foreground">{d.name}</span>
                <span className="font-mono text-muted ms-2">{d.sku}</span>
                <span className="text-muted ms-2">×{d.quantity}</span>
                {d.partId == null && <span className="text-info ms-2">(מק״ט חדש)</span>}
              </div>
              <button
                type="button"
                onClick={() => remove(d.key)}
                className="text-danger hover:underline"
              >הסר</button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input label="מק״ט" name="draft-sku"  value={skuQ}  onChange={(e) => { setSkuQ(e.target.value);  setPicked(null) }} />
        <Input label="שם"   name="draft-name" value={nameQ} onChange={(e) => { setNameQ(e.target.value); setPicked(null) }} />
      </div>

      {matches.length > 0 && !picked && (
        <ul className="bg-card border border-border rounded-md max-h-32 overflow-y-auto">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => pick(p)}
                className="w-full text-start px-2 py-1.5 text-xs hover:bg-muted-surface flex items-center justify-between"
              >
                <span className="text-foreground">{p.name}</span>
                <span className="font-mono text-muted">{p.sku} · במלאי {p.quantity}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2 flex-wrap">
        <Input label="כמות" name="draft-qty" type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="max-w-[6rem]" />
        {picked ? (
          <Button onClick={addExisting} disabled={!qOk} className="text-xs px-3 py-1">+ הוסף לרשימה</Button>
        ) : noMatch ? (
          <Button onClick={addNew} disabled={!qOk} className="text-xs px-3 py-1">+ צור מק״ט חדש והוסף</Button>
        ) : (
          <span className="text-[11px] text-muted">בחר חלק מההצעות, או הקלד מק״ט+שם חדשים</span>
        )}
      </div>
    </div>
  )
}
