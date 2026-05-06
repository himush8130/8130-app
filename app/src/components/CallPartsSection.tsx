import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { useAuthStore } from '../store/auth'
import { useParts } from '../hooks/useParts'
import {
  addRequiredPart,
  recordWithdrawal,
  updateRequiredPartStatus,
  createPart,
  deleteRequiredPart,
} from '../lib/warehouseActions'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { CallRequiredPart, PartWithdrawal, Part } from '../types/parts'
import type { RequiredPartStatus } from '../types/db'

const statusLabel: Record<RequiredPartStatus, string> = {
  in_stock:                 'במלאי',
  awaiting_order:           'ממתין להזמנה',
  awaiting_receipt:         'ממתין לקבלה',
  received:                 'התקבל',
  delivered:                'נמסר',
  rejected:                 'נדחה',
  pending_special_approval: 'לאישור מיוחד',
  rejected_final:           'נדחה סופית',
}

const statusTone: Record<RequiredPartStatus, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  in_stock:                 'success',
  awaiting_order:           'danger',
  awaiting_receipt:         'warning',
  received:                 'info',
  delivered:                'neutral',
  rejected:                 'danger',
  pending_special_approval: 'warning',
  rejected_final:           'neutral',
}

interface Props {
  callId: string
  requiredParts: CallRequiredPart[]
  withdrawals: PartWithdrawal[]
}

export function CallPartsSection({ callId, requiredParts, withdrawals }: Props) {
  const employee = useAuthStore((s) => s.employee)
  const queryClient = useQueryClient()
  const { data: catalog } = useParts()
  const [adding, setAdding] = useState(false)

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['call_detail', callId] })
    queryClient.invalidateQueries({ queryKey: ['parts'] })
    queryClient.invalidateQueries({ queryKey: ['pending_parts_actions'] })
    // Required-part changes can also affect the call's status badge in
    // every list that shows CallCard, plus the per-call worst-status map.
    queryClient.invalidateQueries({ queryKey: ['calls_parts_status'] })
    queryClient.invalidateQueries({ queryKey: ['service_calls'] })
    queryClient.invalidateQueries({ queryKey: ['technician_calls'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle_history'] })
    queryClient.invalidateQueries({ queryKey: ['all_calls'] })
    queryClient.invalidateQueries({ queryKey: ['manager_overview'] })
  }

  if (!employee) return null

  const isWarehouse = employee.permissions === 'warehouse' || employee.permissions === 'manager'
  // Active rows = anything not yet delivered. Delivered rows are
  // represented by their part_withdrawals entry shown below.
  const activeRows = requiredParts.filter((rp) => rp.status !== 'delivered')

  return (
    <Card>
      <CardHeader>
        <ComponentBadge id={5005} />
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">חלקים נדרשים</h3>
          {!adding && (
            <span className="contents">
              <ComponentBadge id={5006} />
              <Button variant="ghost" onClick={() => setAdding(true)} className="text-primary">
                + הוסף חלק
              </Button>
            </span>
          )}
        </div>
      </CardHeader>

      {adding && catalog && (
        <CardBody className="border-b border-border bg-muted-surface">
          <AddPartForm
            catalog={catalog}
            employeeNumber={employee.employee_number}
            callId={callId}
            onDone={() => { setAdding(false); refresh() }}
            onCancel={() => setAdding(false)}
          />
        </CardBody>
      )}

      <CardBody className="p-0">
        {activeRows.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">אין עדיין חלקים נדרשים</p>
        ) : (
          <ul>
            {activeRows.map((rp) => (
              <RequiredPartRow
                key={rp.id}
                row={rp}
                callId={callId}
                isWarehouse={isWarehouse}
                employeeNumber={employee.employee_number}
                onChange={refresh}
              />
            ))}
          </ul>
        )}
      </CardBody>

      {withdrawals.length > 0 && (
        <>
          <CardHeader className="border-t border-border">
            <h3 className="text-sm font-semibold text-foreground">יציאות מהמחסן</h3>
          </CardHeader>
          <CardBody className="p-0">
            <ul>
              {withdrawals.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between px-4 py-2 border-b border-border last:border-0 text-sm"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-foreground">{w.parts?.name ?? '?'}</span>
                    <span className="font-mono text-[11px] text-muted">
                      {w.parts?.sku ?? ''}
                    </span>
                    <span className="text-muted text-xs">×{w.quantity}</span>
                  </div>
                  <span className="text-xs text-muted">
                    {new Date(w.withdrawn_at).toLocaleString('he-IL')}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </>
      )}
    </Card>
  )
}

// ---------- Add part form: search inputs + quantity ----------

function AddPartForm({
  catalog,
  employeeNumber,
  callId,
  onDone,
  onCancel,
}: {
  catalog: Part[]
  employeeNumber: number
  callId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [skuQuery, setSkuQuery] = useState('')
  const [nameQuery, setNameQuery] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [selected, setSelected] = useState<Part | null>(null)
  const [forceOrder, setForceOrder] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matches = useMemo(() => {
    const sku  = skuQuery.trim().toLowerCase()
    const name = nameQuery.trim().toLowerCase()
    if (!sku && !name) return []
    return catalog
      .filter((p) => {
        const skuOk  = !sku  || p.sku.toLowerCase().includes(sku)
        const nameOk = !name || p.name.toLowerCase().includes(name)
        return skuOk && nameOk
      })
      .slice(0, 10)
  }, [catalog, skuQuery, nameQuery])

  function pick(part: Part) {
    setSelected(part)
    setSkuQuery(part.sku)
    setNameQuery(part.name)
  }

  async function submit() {
    setError(null)
    const q = parseInt(quantity, 10)
    if (!selected) {
      setError('בחר חלק מהקטלוג (לחץ על אחת ההצעות)')
      return
    }
    if (Number.isNaN(q) || q <= 0) {
      setError('כמות לא תקינה')
      return
    }
    setBusy(true)
    const res = await addRequiredPart(employeeNumber, callId, selected.id, q, forceOrder)
    setBusy(false)
    if (!res.ok) {
      setError('שגיאה בהוספה')
      return
    }
    onDone()
  }

  async function createAndAdd() {
    setError(null)
    const sku  = skuQuery.trim()
    const name = nameQuery.trim()
    const q    = parseInt(quantity, 10)
    if (!sku || !name) { setError('צריך גם מק״ט וגם שם כדי ליצור חלק חדש'); return }
    if (Number.isNaN(q) || q <= 0) { setError('כמות לא תקינה'); return }
    setBusy(true)
    const created: any = await createPart(employeeNumber, { sku, name, quantity: 0 })
    if (!created.ok || !created.part) {
      setBusy(false)
      setError(created.detail || created.error || 'שגיאה ביצירת מקט')
      return
    }
    const res = await addRequiredPart(employeeNumber, callId, created.part.id, q, forceOrder)
    setBusy(false)
    if (!res.ok) { setError('המקט נוצר אך הוספתו לקריאה נכשלה'); return }
    onDone()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="מק״ט"
          name="skuQuery"
          value={skuQuery}
          onChange={(e) => { setSkuQuery(e.target.value); setSelected(null) }}
          placeholder="הקלד מק״ט..."
        />
        <Input
          label="שם"
          name="nameQuery"
          value={nameQuery}
          onChange={(e) => { setNameQuery(e.target.value); setSelected(null) }}
          placeholder="הקלד שם..."
        />
      </div>

      {matches.length > 0 && !selected && (
        <ul className="bg-card border border-border rounded-md max-h-40 overflow-y-auto">
          {matches.map((p) => (
            <li key={p.sku}>
              <button
                type="button"
                onClick={() => pick(p)}
                className="w-full text-start px-3 py-2 hover:bg-muted-surface text-sm flex items-center justify-between gap-2"
              >
                <span className="text-foreground">{p.name}</span>
                <span className="font-mono text-[11px] text-muted">
                  {p.sku} · במלאי: {p.quantity}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!selected && skuQuery.trim() && nameQuery.trim() && matches.length === 0 && (
        <div className="text-xs text-muted border border-dashed border-border rounded-md p-2">
          לא נמצא מקט תואם בקטלוג. אפשר ליצור מקט חדש (כמות התחלתית 0) ולהוסיף אותו לקריאה.
        </div>
      )}

      {selected && (
        <div className="text-xs text-success">
          ✓ נבחר: {selected.name} ({selected.sku})
          {' '}
          <button type="button" onClick={() => setSelected(null)} className="text-muted underline">
            (החלף)
          </button>
        </div>
      )}

      <Input
        label="כמות"
        name="quantity"
        type="number"
        inputMode="numeric"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        error={error ?? undefined}
        className="max-w-[8rem]"
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={forceOrder}
          onChange={(e) => setForceOrder(e.target.checked)}
        />
        <span className="text-foreground">הזמן גם אם קיים במלאי</span>
        <span className="text-xs text-muted">(תהליך הזמנה גם בלי לרוקן את המלאי הקיים)</span>
      </label>

      <div className="flex gap-2 flex-wrap">
        {selected ? (
          <Button onClick={submit} disabled={busy}>
            {busy ? 'מוסיף...' : 'הוסף'}
          </Button>
        ) : skuQuery.trim() && nameQuery.trim() && matches.length === 0 ? (
          <Button onClick={createAndAdd} disabled={busy}>
            {busy ? 'יוצר...' : '+ צור מקט חדש והוסף'}
          </Button>
        ) : (
          <Button onClick={submit} disabled={busy}>
            {busy ? 'מוסיף...' : 'הוסף'}
          </Button>
        )}
        <Button variant="ghost" onClick={onCancel}>ביטול</Button>
      </div>
    </div>
  )
}

// ---------- Required part row ----------

function RequiredPartRow({
  row,
  callId,
  isWarehouse,
  employeeNumber,
  onChange,
}: {
  row: CallRequiredPart
  callId: string
  isWarehouse: boolean
  employeeNumber: number
  onChange: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const advanceMap: Partial<Record<RequiredPartStatus, { next: RequiredPartStatus; label: string }>> = {
    awaiting_order:   { next: 'awaiting_receipt', label: 'הוזמן' },
    awaiting_receipt: { next: 'received',         label: 'התקבל' },
  }
  // Blocked SKU short-circuits everything: no actions, the row only
  // says "חסום". The required-part is preserved in the DB; the call
  // simply waits until the warehouse assigns a fresh SKU.
  const isBlocked = !!row.parts?.is_sku_blocked
  const action = isBlocked ? undefined : advanceMap[row.status]
  const canDeliver = !isBlocked && isWarehouse && (row.status === 'in_stock' || row.status === 'received')

  async function advance() {
    if (!action) return
    setBusy(true); setError(null)
    const res = await updateRequiredPartStatus(employeeNumber, row.id, action.next)
    setBusy(false)
    if (!res.ok) { setError('שגיאה'); return }
    onChange()
  }

  async function deliver() {
    setError(null); setBusy(true)
    const res = await recordWithdrawal(
      employeeNumber, callId, row.part_id, row.quantity,
      row.requested_by ?? employeeNumber, row.id,
    )
    setBusy(false)
    if (!res.ok) {
      setError(
        res.error === 'insufficient_stock'
          ? `במלאי רק ${res.available}`
          : 'שגיאה',
      )
      return
    }
    onChange()
  }

  const [confirmDelete, setConfirmDelete] = useState(false)
  async function remove() {
    setError(null); setBusy(true)
    const res = await deleteRequiredPart(employeeNumber, row.id)
    setBusy(false)
    if (!res.ok) { setError('שגיאה במחיקה'); return }
    setConfirmDelete(false)
    onChange()
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3 border-b border-border last:border-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-sm text-foreground truncate">
            {row.parts?.name ?? '?'}
          </span>
          <span className="font-mono text-[11px] text-muted">
            {row.parts?.sku ?? ''}
          </span>
          <span className="text-xs text-muted">×{row.quantity}</span>
          {isBlocked
            ? <Badge tone="warning">⚠ מק״ט חסום</Badge>
            : <Badge tone={statusTone[row.status]}>{statusLabel[row.status]}</Badge>}
        </div>

        <div className="flex gap-1.5 items-center flex-wrap">
          {canDeliver ? (
            <span className="contents">
              <ComponentBadge id={5007} />
              <Button onClick={deliver} disabled={busy}>
                {busy ? '...' : `מסור לטכנאי (${row.quantity})`}
              </Button>
            </span>
          ) : isWarehouse && action ? (
            <Button onClick={advance} disabled={busy}>
              {busy ? '...' : action.label}
            </Button>
          ) : null}
          {!confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
              className="text-xs text-muted hover:text-danger underline"
              title="מחק חלק נדרש (במקרה שהוקלד בטעות)"
            >
              <ComponentBadge id={5018} />
              מחק
            </button>
          )}
        </div>
      </div>
      {confirmDelete && (
        <div className="flex items-center gap-2 bg-danger/5 rounded-md p-2 text-xs">
          <span>למחוק את {row.parts?.name ?? 'הפריט'}?</span>
          <Button onClick={remove} disabled={busy}>{busy ? '...' : 'אשר'}</Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>ביטול</Button>
        </div>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </li>
  )
}
