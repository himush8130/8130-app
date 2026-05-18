import { useEffect, useMemo, useState } from 'react'
import { useAppSettings } from '../hooks/useAppSettings'
import { useVehiclesMap } from '../hooks/useVehicles'
import { useAuthStore } from '../store/auth'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { formatVehicleNumber } from '../lib/copyFormat'
import type { CallRequiredPart } from '../types/parts'

interface Props {
  /** Vehicle number from the existing call OR from the in-progress NewCallForm input. */
  vehicleNumber:    string | null
  /** Free-text fault description from the call (or in-progress form). */
  description:      string | null
  /** Required parts on the call — used to derive the default of "חלקים יש/אין". */
  requiredParts?:   Pick<CallRequiredPart, 'status'>[]
  /** Badge id placed inside the open panel. */
  badgeId?:         number
}

/**
 * Locked panel that opens when the user clicks "הזמן כיתה". Composes
 * the unit's class-order WhatsApp message from app_settings + vehicle
 * + call data + a small set of blocking user inputs.
 */
export function OrderClassPanel({
  vehicleNumber, description, requiredParts, badgeId,
}: Props) {
  const employee = useAuthStore((s) => s.employee)
  const { data: settings } = useAppSettings()
  const vehiclesMap = useVehiclesMap()
  const [open, setOpen] = useState(false)

  if (!employee) return null
  return open ? (
    <OrderClassEditor
      employeeName={employee.name}
      employeePhone={employee.phone ?? ''}
      vehicleNumber={vehicleNumber}
      description={description}
      requiredParts={requiredParts}
      vehicle={vehicleNumber ? vehiclesMap.get(vehicleNumber) ?? null : null}
      tsakah={settings?.copy_tsakah_value ?? ''}
      onClose={() => setOpen(false)}
      badgeId={badgeId}
    />
  ) : (
    <Card>
      {badgeId && <ComponentBadge id={badgeId} />}
      <CardBody className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm text-foreground">דרישת כיתת אחזקה (פורמט קבוע)</span>
        <Button variant="secondary" onClick={() => setOpen(true)}>הזמן כיתה</Button>
      </CardBody>
    </Card>
  )
}

interface EditorProps {
  employeeName:   string
  employeePhone:  string
  vehicleNumber:  string | null
  description:    string | null
  requiredParts?: Pick<CallRequiredPart, 'status'>[]
  vehicle:        { vehicle_number: string; model: string | null; location: string | null } | null
  tsakah:         string
  onClose:        () => void
  badgeId?:       number
}

function todayDDMMYYYY(d = new Date()): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function defaultPartsAvail(parts: Pick<CallRequiredPart, 'status'>[] | undefined): 'יש' | 'אין' {
  if (!parts || parts.length === 0) return 'אין'
  return parts.every((p) => p.status === 'received') ? 'יש' : 'אין'
}

function OrderClassEditor({
  employeeName, employeePhone, vehicleNumber, description, requiredParts,
  vehicle, tsakah, onClose, badgeId,
}: EditorProps) {
  // Auto-fill defaults from data sources; every field stays editable.
  const [tsakahV, setTsakah]       = useState(tsakah)
  const [modelV, setModel]         = useState(vehicle?.model ?? '')
  const [classV, setClass]         = useState('')                                  // required, no default
  const [vnumV, setVnum]           = useState(formatVehicleNumber(vehicle?.vehicle_number ?? vehicleNumber ?? '') || (vehicleNumber ?? ''))
  const [faultV, setFault]         = useState(description ?? '')
  const [partsV, setPartsV]        = useState<'יש' | 'אין'>(defaultPartsAvail(requiredParts))
  const [dateV, setDate]           = useState('')                                  // required, no default — future date
  const [locationV, setLocation]   = useState(vehicle?.location ?? '')
  const [contactV, setContact]     = useState(employeeName)
  const [phoneV, setPhone]         = useState(employeePhone)
  const [crossingV, setCrossing]   = useState<'' | 'yes' | 'no'>('')               // required, no default
  const [copied, setCopied]        = useState(false)
  const [error, setError]          = useState<string | null>(null)

  // Keep auto defaults fresh when the underlying data appears late.
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

  function formatDateForOutput(iso: string): string {
    // <input type="date"> gives "YYYY-MM-DD"; output expected "DD/MM/YYYY".
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

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
      `תאריך: ${formatDateForOutput(dateV) || todayDDMMYYYY()}`,
      `מיקום : ${locationV}`,
      `איש קשר: ${contactV}`,
      `מס' פלאפון: ${phoneV}`,
      '',
      crossingV === 'yes' ? '*חוצה גבל*' : '*ללא חציית גבל*',
    ]
    return lines.join('\n')
  }

  async function copy() {
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

  return (
    <Card>
      {badgeId && <ComponentBadge id={badgeId} />}
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">דרישת כיתת אחזקה</h3>
          <Button variant="ghost" onClick={onClose} className="text-xs px-2 py-1">סגור</Button>
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

        <div className="flex gap-2 items-center">
          <Button onClick={copy} disabled={!!blocking}>
            {copied ? '✓ הועתק' : 'העתק טקסט'}
          </Button>
          {error && <span className="text-xs text-danger">{error}</span>}
          {blocking && !error && <span className="text-xs text-muted">{blocking}</span>}
        </div>
      </CardBody>
    </Card>
  )
}
