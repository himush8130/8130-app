import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppSettings } from '../hooks/useAppSettings'
import { useVehiclesMap } from '../hooks/useVehicles'
import { useCallClassOrder } from '../hooks/useClassOrders'
import { useAuthStore } from '../store/auth'
import { upsertClassOrder, type ClassOrderInput } from '../lib/adminActions'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { formatVehicleNumber } from '../lib/copyFormat'
import type { CallRequiredPart } from '../types/parts'

export interface OrderClassPanelHandle {
  /** Called by the new-call form after the call has been created.
   *  If the panel was opened and the user filled in the required
   *  fields, the form is persisted against the new call_id. Safe
   *  to call when the panel was never opened — it'll no-op. */
  saveIfFilled(callId: string): Promise<{ saved: boolean; error?: string }>
}

interface Props {
  /** Existing call this panel belongs to, or null when used inside the
   *  new-call form (then save is deferred until the call is created). */
  callId:         string | null
  /** Vehicle number from the existing call OR from the in-progress NewCallForm input. */
  vehicleNumber:  string | null
  /** Free-text fault description from the call (or in-progress form). */
  description:    string | null
  /** Required parts on the call — drives the default of "חלקים יש/אין". */
  requiredParts?: Pick<CallRequiredPart, 'status'>[]
  /** Badge id placed inside the open panel. */
  badgeId?:       number
}

/**
 * Locked panel that opens when the user clicks "הזמן כיתה".
 * - Tech: sees only "שמור" — fills the form and the data persists.
 * - Manager: sees "שמור" AND "העתק טקסט" so they can dispatch.
 *
 * On call-detail pages the panel pre-populates from any existing
 * class_orders row, so re-opening the panel shows the last save and
 * acts as edit. Within the new-call form the parent calls
 * saveIfFilled() via the ref after creating the call.
 */
export const OrderClassPanel = forwardRef<OrderClassPanelHandle, Props>(function OrderClassPanel(
  { callId, vehicleNumber, description, requiredParts, badgeId },
  ref,
) {
  const employee = useAuthStore((s) => s.employee)
  const { data: settings } = useAppSettings()
  const vehiclesMap = useVehiclesMap()
  const queryClient = useQueryClient()
  const { data: existing } = useCallClassOrder(callId)
  const [open, setOpen] = useState(false)
  // Reopen automatically when an existing record loads — manager-flow.
  useEffect(() => {
    if (existing) setOpen(true)
  }, [existing])

  // The state lives at the wrapper level so the ref-handle below can
  // read it even when the locked card is rendered (panel closed).
  const vehicle = vehicleNumber ? vehiclesMap.get(vehicleNumber) ?? null : null
  const tsakah  = settings?.copy_tsakah_value ?? ''

  const initialVnum = formatVehicleNumber(vehicle?.vehicle_number ?? vehicleNumber ?? '') || (vehicleNumber ?? '')

  const [tsakahV,   setTsakah]   = useState(existing?.tsakah ?? tsakah)
  const [modelV,    setModel]    = useState(existing?.model ?? vehicle?.model ?? '')
  const [classV,    setClass]    = useState(existing?.class_required ?? '')
  const [vnumV,     setVnum]     = useState(existing?.vehicle_number ?? initialVnum)
  const [faultV,    setFault]    = useState(existing?.fault ?? description ?? '')
  const [partsV,    setPartsV]   = useState<'יש' | 'אין'>(
    (existing?.parts_available as 'יש' | 'אין') ?? defaultPartsAvail(requiredParts),
  )
  const [dateV,     setDate]     = useState(existing?.target_date ?? '')
  const [locationV, setLocation] = useState(existing?.location ?? vehicle?.location ?? '')
  const [contactV,  setContact]  = useState(existing?.contact_name ?? employee?.name ?? '')
  const [phoneV,    setPhone]    = useState(existing?.contact_phone ?? employee?.phone ?? '')
  const [crossingV, setCrossing] = useState<'' | 'yes' | 'no'>((existing?.crossing_gvul as '' | 'yes' | 'no') ?? '')
  const [copied, setCopied]      = useState(false)
  const [savedAt, setSavedAt]    = useState<number | null>(null)
  const [busy, setBusy]          = useState(false)
  const [error, setError]        = useState<string | null>(null)

  // Whenever the existing record (re)loads, seed any field that the
  // user hasn't started editing locally. We only overwrite empty
  // fields so an opened-but-unsaved edit isn't lost.
  useEffect(() => {
    if (!existing) return
    setTsakah((v) => v || existing.tsakah || '')
    setModel((v) => v || existing.model || '')
    setClass((v) => v || existing.class_required || '')
    setVnum((v) => v || existing.vehicle_number || '')
    setFault((v) => v || existing.fault || '')
    if (existing.parts_available === 'יש' || existing.parts_available === 'אין') {
      setPartsV(existing.parts_available)
    }
    setDate((v) => v || existing.target_date || '')
    setLocation((v) => v || existing.location || '')
    setContact((v) => v || existing.contact_name || '')
    setPhone((v) => v || existing.contact_phone || '')
    if (existing.crossing_gvul === 'yes' || existing.crossing_gvul === 'no') {
      setCrossing(existing.crossing_gvul)
    }
  }, [existing])

  // Same for the inferred defaults from the parent surfaces.
  useEffect(() => { if (tsakah && !tsakahV) setTsakah(tsakah) }, [tsakah])  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (vehicle?.model && !modelV) setModel(vehicle.model)
    if (vehicle?.location && !locationV) setLocation(vehicle.location)
    const num = formatVehicleNumber(vehicle?.vehicle_number ?? vehicleNumber ?? '') || (vehicleNumber ?? '')
    if (num && !vnumV) setVnum(num)
  }, [vehicle, vehicleNumber]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (description && !faultV) setFault(description) }, [description])  // eslint-disable-line react-hooks/exhaustive-deps

  const blocking = useMemo(() => {
    if (!classV.trim())  return 'כיתה נדרשת חובה'
    if (!dateV)          return 'תאריך חובה'
    if (!crossingV)      return 'בחר חציית גבל: כן/לא'
    return null
  }, [classV, dateV, crossingV])

  const isManager = employee?.permissions === 'manager'

  function buildText(): string {
    const lines = [
      '*פורמט דרישת כיתות אחזקה*',
      `צק״ח: ${tsakahV}`,
      `סוג צלם: ${modelV}`,
      `כיתה נדרשת: ${classV}`,
      `צ': ${vnumV}`,
      '',
      'תקלה:',
      faultV,
      '',
      `חלקים יש / אין: ${partsV}`,
      '',
      `תאריך: ${formatDateForOutput(dateV)}`,
      `מיקום : ${locationV}`,
      `איש קשר: ${contactV}`,
      `מס' פלאפון: ${phoneV}`,
      '',
      crossingV === 'yes' ? '*חוצה גבל*' : '*ללא חציית גבל*',
    ]
    return lines.join('\n')
  }

  function buildPayload(forCallId: string): ClassOrderInput {
    return {
      call_id:         forCallId,
      tsakah:          tsakahV || null,
      model:           modelV || null,
      class_required:  classV.trim(),
      vehicle_number:  vnumV || null,
      fault:           faultV || null,
      parts_available: partsV,
      target_date:     dateV,
      location:        locationV || null,
      contact_name:    contactV || null,
      contact_phone:   phoneV || null,
      crossing_gvul:   crossingV as 'yes' | 'no',
    }
  }

  async function persist(forCallId: string): Promise<{ ok: boolean; error?: string }> {
    if (!employee) return { ok: false, error: 'no_employee' }
    const res = await upsertClassOrder(employee.employee_number, buildPayload(forCallId))
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ['class_orders'] })
      queryClient.invalidateQueries({ queryKey: ['class_order', forCallId] })
    }
    return { ok: !!res.ok, error: res.error }
  }

  async function onSave() {
    setError(null)
    if (blocking) { setError(blocking); return }
    if (!callId)  { setError('שמור קודם את הקריאה — הכיתה תישמר אוטומטית עם הקריאה'); return }
    setBusy(true)
    const r = await persist(callId)
    setBusy(false)
    if (!r.ok) { setError('שמירה נכשלה'); return }
    setSavedAt(Date.now())
    setTimeout(() => setSavedAt(null), 1500)
  }

  async function onCopy() {
    setError(null)
    if (blocking) { setError(blocking); return }
    try {
      await navigator.clipboard.writeText(buildText())
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('הדפדפן לא איפשר העתקה')
    }
  }

  useImperativeHandle(ref, () => ({
    async saveIfFilled(forCallId: string) {
      // Nothing meaningful entered → nothing to persist.
      if (!classV.trim() || !dateV || !crossingV) return { saved: false }
      const r = await persist(forCallId)
      return { saved: r.ok, error: r.error }
    },
  }), [classV, dateV, crossingV, tsakahV, modelV, vnumV, faultV, partsV, locationV, contactV, phoneV])

  if (!employee) return null

  if (!open) {
    return (
      <Card>
        {badgeId && <ComponentBadge id={badgeId} />}
        <CardBody className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm text-foreground">דרישת כיתת אחזקה (פורמט קבוע)</span>
          <Button variant="secondary" onClick={() => setOpen(true)}>הזמן כיתה</Button>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      {badgeId && <ComponentBadge id={badgeId} />}
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">דרישת כיתת אחזקה</h3>
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-xs px-2 py-1">סגור</Button>
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="צק״ח" name="oc-tsakah" value={tsakahV} onChange={(e) => setTsakah(e.target.value)} />
          <Input label="סוג צלם (סוג הכלי)" name="oc-model" value={modelV} onChange={(e) => setModel(e.target.value)} />
          <Input label="כיתה נדרשת *" name="oc-class" value={classV} onChange={(e) => setClass(e.target.value)} />
          <Input label="צ׳" name="oc-vnum" value={vnumV} onChange={(e) => setVnum(e.target.value)} />
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">תקלה</span>
          <textarea
            value={faultV}
            onChange={(e) => setFault(e.target.value)}
            rows={3}
            className="px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">חלקים יש / אין</span>
            <select
              value={partsV}
              onChange={(e) => setPartsV(e.target.value as 'יש' | 'אין')}
              className="px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="יש">יש</option>
              <option value="אין">אין</option>
            </select>
            <span className="text-[11px] text-muted">ברירת מחדל: יש חלקים וכולם בסטטוס "התקבל" → "יש".</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">תאריך *</span>
            <input
              type="date"
              value={dateV}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <Input label="מיקום" name="oc-loc" value={locationV} onChange={(e) => setLocation(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="איש קשר" name="oc-contact" value={contactV} onChange={(e) => setContact(e.target.value)} />
          <Input label="מס' פלאפון" name="oc-phone" value={phoneV} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">חציית גבל *</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCrossing('yes')}
              className={`px-3 py-2 rounded-md border text-sm ${crossingV === 'yes' ? 'bg-primary text-primary-fg border-primary' : 'bg-card border-border text-foreground'}`}
            >
              כן
            </button>
            <button
              type="button"
              onClick={() => setCrossing('no')}
              className={`px-3 py-2 rounded-md border text-sm ${crossingV === 'no' ? 'bg-primary text-primary-fg border-primary' : 'bg-card border-border text-foreground'}`}
            >
              לא
            </button>
          </div>
        </label>

        <div className="flex gap-2 items-center flex-wrap">
          <Button onClick={onSave} disabled={!!blocking || busy}>
            {busy ? 'שומר...' : savedAt ? '✓ נשמר' : 'שמור'}
          </Button>
          {isManager && (
            <Button variant="secondary" onClick={onCopy} disabled={!!blocking}>
              {copied ? '✓ הועתק' : 'העתק טקסט'}
            </Button>
          )}
          {error && <span className="text-xs text-danger">{error}</span>}
          {blocking && !error && <span className="text-xs text-muted">{blocking}</span>}
        </div>
      </CardBody>
    </Card>
  )
})

// ---- helpers ----

function defaultPartsAvail(parts: Pick<CallRequiredPart, 'status'>[] | undefined): 'יש' | 'אין' {
  if (!parts || parts.length === 0) return 'אין'
  return parts.every((p) => p.status === 'received') ? 'יש' : 'אין'
}

function formatDateForOutput(iso: string): string {
  // <input type="date"> gives "YYYY-MM-DD"; expected output "DD/MM/YYYY".
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
