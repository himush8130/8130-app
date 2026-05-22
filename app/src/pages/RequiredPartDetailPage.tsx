import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { useRequiredPartDetail } from '../hooks/useRequiredPartDetail'
import { recordWithdrawal, setRequiredPartOrderNumber, updateRequiredPartStatus, updatePart, type ReceiveDestination, type PartUpdates } from '../lib/warehouseActions'
import { AppHeader } from '../components/AppHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { StatusBadgeMenu } from '../components/StatusBadgeMenu'
import { ReceiveDestinationDialog } from '../components/ReceiveDestinationDialog'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { Part } from '../types/parts'
import type { RequiredPartStatus } from '../types/db'

function PartSkuEditor({
  partId, currentSku, employeeNumber, onSaved,
}: {
  partId: string
  currentSku: string
  employeeNumber: number
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentSku)
  const [busy, setBusy] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (!editing) setValue(currentSku) }, [currentSku, editing])

  async function save() {
    setError(null)
    const trimmed = value.trim()
    if (!trimmed) { setError('מק״ט חובה'); return }
    if (trimmed === currentSku) { setEditing(false); return }
    setBusy(true)
    const res = await updatePart(employeeNumber, partId, { sku: trimmed })
    setBusy(false)
    if (!res.ok) { setError('שמירה נכשלה'); return }
    setEditing(false)
    setSavedAt(Date.now())
    setTimeout(() => setSavedAt(null), 1500)
    onSaved()
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="font-mono text-xs text-muted">{currentSku}</span>
        <button
          type="button"
          onClick={() => { setEditing(true); setValue(currentSku) }}
          className="text-[11px] text-primary hover:underline"
        >
          ערוך מק״ט
        </button>
        {savedAt && <span className="text-[11px] text-success">✓</span>}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="px-2 py-1 bg-card border border-primary rounded text-xs font-mono w-40"
      />
      <Button onClick={save} disabled={busy} className="text-xs px-3 py-1">
        {busy ? '...' : 'שמור'}
      </Button>
      <Button
        variant="ghost"
        onClick={() => { setEditing(false); setValue(currentSku); setError(null) }}
        className="text-xs px-3 py-1"
      >
        ביטול
      </Button>
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </span>
  )
}

function ReplacementSkuEditor({
  part, employeeNumber, onSaved,
}: {
  part: Part
  employeeNumber: number
  onSaved: () => void
}) {
  const [value, setValue] = useState(part.replacement_sku ?? '')
  const [busy, setBusy] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setValue(part.replacement_sku ?? '') }, [part.replacement_sku])

  const dirty = value.trim() !== (part.replacement_sku ?? '').trim()

  async function save() {
    setBusy(true); setError(null)
    const updates: PartUpdates = { replacement_sku: value.trim() || null }
    const res = await updatePart(employeeNumber, part.id, updates)
    setBusy(false)
    if (!res.ok) { setError('שגיאה'); return }
    setSavedAt(Date.now())
    setTimeout(() => setSavedAt(null), 1500)
    onSaved()
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Input
          label="מק״ט חליפי (אופציונלי)"
          name={`replacement-${part.id}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="המק״ט שמחליף את החסום"
        />
      </div>
      <Button onClick={save} disabled={busy || !dirty} className="text-xs px-3 py-2">
        {busy ? '...' : 'שמור'}
      </Button>
      {savedAt && <span className="text-xs text-success">✓</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}

function OrderNumberEditor({
  rowId, initial, onSaved,
}: {
  rowId: string
  initial: string | null
  onSaved: () => void
}) {
  const employee = useAuthStore((s) => s.employee)!
  const [value, setValue] = useState(initial ?? '')
  const [busy, setBusy] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setValue(initial ?? '') }, [initial])

  const dirty = value.trim() !== (initial ?? '').trim()

  async function save() {
    setBusy(true); setError(null)
    const trimmed = value.trim() || null
    const res = await setRequiredPartOrderNumber(employee.employee_number, rowId, trimmed)
    setBusy(false)
    if (!res.ok) { setError('שגיאה'); return }
    setSavedAt(Date.now())
    setTimeout(() => setSavedAt(null), 1500)
    onSaved()
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Input
          label="מספר הזמנה (אופציונלי)"
          name={`order-num-${rowId}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="PO-2026-0042"
        />
      </div>
      <Button onClick={save} disabled={busy || !dirty} className="text-xs px-3 py-2">
        {busy ? '...' : 'שמור'}
      </Button>
      {savedAt && <span className="text-xs text-success">✓</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}

function locationLabel(p: Part): string {
  const out: string[] = []
  if (p.warehouse) out.push(p.warehouse)
  if (p.cabinet)        out.push(`ארון ${p.cabinet}`)
  if (p.storage_type)   out.push(p.storage_type)
  if (p.storage_number) out.push(`#${p.storage_number}`)
  if (p.cell_number)    out.push(`תא ${p.cell_number}`)
  return out.length === 0 ? '—' : out.join(' · ')
}

export function RequiredPartDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const employee = useAuthStore((s) => s.employee)!
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useRequiredPartDetail(id)
  const [pickedSource, setPickedSource] = useState<string>('')   // parts.id of chosen location
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [receiveOpen, setReceiveOpen] = useState(false)

  const canChangeStatus = employee.permissions === 'warehouse' || employee.permissions === 'manager'

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['required_part_detail', id] })
    queryClient.invalidateQueries({ queryKey: ['parts'] })
    queryClient.invalidateQueries({ queryKey: ['pending_parts_actions'] })
    queryClient.invalidateQueries({ queryKey: ['call_detail'] })
    queryClient.invalidateQueries({ queryKey: ['calls_parts_status'] })
    queryClient.invalidateQueries({ queryKey: ['service_calls'] })
  }

  async function dispense(qty?: number) {
    if (!data) return
    if (!pickedSource) { setActionError('בחר מיקום'); return }
    if (!data.row.call_id) { setActionError('פריט מהזמנת מחסן — אין הנפקה לטכנאי. עדכן סטטוס בלבד.'); return }
    const requested = qty ?? data.row.quantity
    setBusy(true); setActionError(null)
    const res = await recordWithdrawal(
      employee.employee_number,
      data.row.call_id,
      pickedSource,
      requested,
      employee.employee_number,
      data.row.id,
      false,  // is_external retired — "מלאי חיצוני" is now a regular catalog row.
    )
    setBusy(false)
    if (!res.ok) {
      setActionError(
        res.error === 'insufficient_stock'
          ? `אין מספיק במיקום הזה (נותר ${res.available})`
          : res.error === 'exceeds_required_quantity'
            ? `מקסימום ${res.available}`
            : 'הנפקה נכשלה',
      )
      return
    }
    refresh()
  }

  async function unblock() {
    if (!data?.row.parts) return
    setBusy(true)
    await updatePart(employee.employee_number, data.row.part_id, { is_sku_blocked: false })
    setBusy(false)
    refresh()
  }

  async function advance(next: RequiredPartStatus, receive?: ReceiveDestination) {
    setBusy(true); setActionError(null)
    const res = await updateRequiredPartStatus(employee.employee_number, data!.row.id, next, null, receive)
    setBusy(false)
    if (!res.ok) { setActionError('שגיאה'); return }
    refresh()
  }

  if (isLoading) {
    return <><AppHeader subtitle="פריט נדרש" /><main className="max-w-3xl mx-auto p-4 text-sm text-muted">טוען...</main></>
  }
  if (error || !data) {
    return <><AppHeader subtitle="פריט נדרש" /><main className="max-w-3xl mx-auto p-4"><Card><CardBody><p className="text-danger text-sm">לא ניתן לטעון את הפריט</p></CardBody></Card></main></>
  }

  const row = data.row
  const part = (row as any).parts as Part | null
  const isBlocked = !!part?.is_sku_blocked
  const canDeliver = !isBlocked && (row.status === 'in_stock' || row.status === 'received')

  return (
    <>
      <AppHeader subtitle="ניהול והנפקת פריט" />
      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4 pb-24">
        <ComponentBadge id={4013} />
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/warehouse'))}
          className="self-start text-sm text-primary"
        >
          → חזור
        </button>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground">{part?.name ?? '?'}</h2>
            {canChangeStatus && part?.sku
              ? <PartSkuEditor
                  partId={part.id}
                  currentSku={part.sku}
                  employeeNumber={employee.employee_number}
                  onSaved={refresh}
                />
              : <span className="font-mono text-xs text-muted">{part?.sku}</span>
            }
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted">סטטוס (לחץ לשינוי)</div>
              <StatusBadgeMenu
                rowId={row.id}
                partId={row.part_id}
                currentStatus={row.status}
                isSkuBlocked={isBlocked}
                onChanged={refresh}
              />
            </div>
            <div>
              <div className="text-xs text-muted">כמות</div>
              <span className="text-foreground font-medium">{row.quantity}</span>
            </div>
            {data.call && (
              <div className="col-span-2">
                <div className="text-xs text-muted">קריאה</div>
                <Link to={`/call/${data.call.id}`} className="text-sm text-primary hover:underline">
                  {data.call.display_id}
                  {data.call.vehicle_number && ` · כלי ${data.call.vehicle_number}`}
                </Link>
              </div>
            )}
            {row.rejection_reason && (
              <div className="col-span-2">
                <div className="text-xs text-muted">סיבת דחייה</div>
                <span className="text-sm text-danger">{row.rejection_reason}</span>
              </div>
            )}
            {(row as any).awaiting_receipt_since && (
              <div>
                <div className="text-xs text-muted">תאריך הזמנה</div>
                <span className="text-sm text-foreground font-mono">
                  {new Date((row as any).awaiting_receipt_since).toLocaleString('he-IL', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {data.call?.description && (
              <div className="col-span-2">
                <div className="text-xs text-muted">תיאור התקלה</div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{data.call.description}</p>
              </div>
            )}
            {canChangeStatus && (
              <div className="col-span-2">
                <OrderNumberEditor
                  rowId={row.id}
                  initial={(row as any).order_number ?? null}
                  onSaved={refresh}
                />
              </div>
            )}
          </CardBody>
        </Card>

        {/* Blocked SKU shortcut */}
        {isBlocked && canChangeStatus && part && (
          <Card>
            <CardBody className="flex flex-col gap-3">
              <p className="text-sm text-foreground">
                המק״ט מסומן כחסום. ניתן לבטל חסימה ידנית, או להעביר את הפריט לסטטוס אחר —
                המעבר יבטל את החסימה אוטומטית.
              </p>
              <ReplacementSkuEditor
                part={part}
                employeeNumber={employee.employee_number}
                onSaved={refresh}
              />
              <div>
                <Button onClick={unblock} disabled={busy} className="text-xs px-3 py-1">
                  בטל סימון מק״ט חסום
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Locations — always visible. Interactive (radio + dispense
            button) only when canDeliver; otherwise read-only listing. */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">מיקומי הפריט במחסן</h3>
            {canDeliver && canChangeStatus && (
              <p className="text-xs text-muted mt-1">בחר מיקום שממנו מנפיקים, או "מלאי חיצוני".</p>
            )}
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            <ul className="flex flex-col gap-1">
              {data.locations.map((loc) => {
                const enough = loc.quantity >= row.quantity
                const interactive = canDeliver && canChangeStatus
                return (
                  <li key={loc.id}>
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-md border ${
                      interactive ? 'cursor-pointer' : ''
                    } ${
                      pickedSource === loc.id ? 'border-primary bg-primary/5' : 'border-border'
                    }`}>
                      {interactive && (
                        <input
                          type="radio"
                          name="source"
                          value={loc.id}
                          checked={pickedSource === loc.id}
                          onChange={() => setPickedSource(loc.id)}
                        />
                      )}
                      <span className="flex-1 text-sm text-foreground truncate">{locationLabel(loc)}</span>
                      <span className={`text-xs ${interactive ? (enough ? 'text-success' : 'text-danger') : 'text-muted'}`}>
                        זמין: {loc.quantity}
                      </span>
                    </label>
                  </li>
                )
              })}
              {data.locations.length === 0 && (
                <li className="text-xs text-muted py-1">אין מיקומים פנימיים לפריט זה — ניתן להנפיק ממלאי חיצוני בלבד.</li>
              )}
            </ul>
            {canDeliver && canChangeStatus && (
              <PartialDispenseControls
                requiredQty={row.quantity}
                busy={busy}
                pickedSource={pickedSource}
                onDispense={(q) => dispense(q)}
                actionError={actionError}
              />
            )}
          </CardBody>
        </Card>

        {/* Non-deliverable status: just status changes */}
        {!canDeliver && !isBlocked && canChangeStatus && (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-foreground">פעולות סטטוס</h3>
            </CardHeader>
            <CardBody className="flex flex-col gap-2 items-start">
              {row.status === 'awaiting_order' && (
                <Button onClick={() => advance('awaiting_receipt')} disabled={busy} className="bg-danger hover:bg-danger/90 text-white">
                  סמן כמוזמן
                </Button>
              )}
              {row.status === 'awaiting_receipt' && (
                <Button
                  onClick={() => { setActionError(null); setReceiveOpen(true) }}
                  disabled={busy}
                  className="bg-warning hover:bg-warning/90 text-white"
                >
                  סמן כהתקבל
                </Button>
              )}
              {row.status === 'rejected' && (
                <div className="flex gap-2">
                  <Button onClick={() => advance('pending_special_approval')} disabled={busy} className="bg-warning hover:bg-warning/90 text-white text-xs px-3 py-1">
                    לאישור מיוחד
                  </Button>
                  <Button onClick={() => advance('rejected_final')} disabled={busy} variant="secondary" className="text-xs px-3 py-1">
                    נדחה סופית
                  </Button>
                </div>
              )}
              {actionError && <span className="text-xs text-danger">{actionError}</span>}
            </CardBody>
          </Card>
        )}

        {/* Delivered: show what was dispensed and allow revert */}
        {row.status === 'delivered' && (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-foreground">פרטי הנפקה</h3>
            </CardHeader>
            <CardBody className="text-sm flex flex-col gap-1">
              <div>
                <span className="text-muted">תאריך:</span>{' '}
                <span className="font-mono">
                  {data.withdrawal ? new Date(data.withdrawal.withdrawn_at).toLocaleString('he-IL') : '—'}
                </span>
              </div>
              <div>
                <span className="text-muted">מיקום:</span>{' '}
                <span className="text-foreground">
                  {data.withdrawal?.is_external
                    ? 'מלאי חיצוני'
                    : data.withdrawal?.source ? locationLabel(data.withdrawal.source) : '—'}
                </span>
              </div>
            </CardBody>
          </Card>
        )}

        {receiveOpen && (
          <ReceiveDestinationDialog
            partId={row.part_id}
            busy={busy}
            subtitle={part?.name ? `${part.name} · ${part.sku}` : undefined}
            onClose={() => setReceiveOpen(false)}
            onConfirm={async (dest) => {
              setReceiveOpen(false)
              await advance('received', dest)
            }}
          />
        )}

      </main>
    </>
  )
}

// Standalone dispense controls: full button + an optional partial-qty
// editor that the warehouse user opens when they want to hand over
// fewer units than requested. The remainder stays on the call as a
// fresh awaiting_* row.
function PartialDispenseControls({
  requiredQty, busy, pickedSource, onDispense, actionError,
}: {
  requiredQty:  number
  busy:         boolean
  pickedSource: string | null
  onDispense:   (qty: number) => void
  actionError:  string | null
}) {
  const [partialOpen, setPartialOpen] = useState(false)
  const [qty, setQty] = useState(Math.max(1, requiredQty - 1))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-center flex-wrap">
        <Button onClick={() => onDispense(requiredQty)} disabled={busy || !pickedSource}>
          {busy ? '...' : `הנפק ${requiredQty}`}
        </Button>
        {requiredQty > 1 && (
          <Button
            variant="ghost"
            onClick={() => { setPartialOpen((v) => !v); setQty(Math.max(1, requiredQty - 1)) }}
            disabled={busy}
            className="text-xs"
          >
            הנפקה חלקית
          </Button>
        )}
        {actionError && <span className="text-xs text-danger">{actionError}</span>}
      </div>
      {partialOpen && (
        <div className="flex flex-wrap items-center gap-2 bg-muted-surface/60 rounded-md p-2 text-xs">
          <span className="text-muted">כמות (מתוך {requiredQty}):</span>
          <input
            type="number"
            min={1}
            max={requiredQty - 1}
            value={qty}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10)
              if (!Number.isFinite(n)) return
              setQty(Math.max(1, Math.min(requiredQty - 1, n)))
            }}
            className="w-20 px-2 py-1 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button
            onClick={() => onDispense(qty)}
            disabled={busy || !pickedSource || qty < 1 || qty >= requiredQty}
            className="text-xs px-3 py-1"
          >
            {busy ? '...' : `הנפק ${qty}`}
          </Button>
          <Button variant="ghost" onClick={() => setPartialOpen(false)} className="text-xs px-3 py-1">
            ביטול
          </Button>
          <span className="text-muted">· יישארו {requiredQty - qty} ממתינים</span>
        </div>
      )}
    </div>
  )
}
