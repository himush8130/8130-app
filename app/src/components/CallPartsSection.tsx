import { useState } from 'react'
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
} from '../lib/warehouseActions'
import type { CallRequiredPart, PartWithdrawal } from '../types/parts'
import type { RequiredPartStatus } from '../types/db'

const statusLabel: Record<RequiredPartStatus, string> = {
  in_stock:         'במלאי',
  awaiting_order:   'ממתין להזמנה',
  awaiting_receipt: 'ממתין לקבלה',
  received:         'התקבל',
}

const statusTone: Record<RequiredPartStatus, 'info' | 'success' | 'warning' | 'neutral'> = {
  in_stock:         'success',
  awaiting_order:   'warning',
  awaiting_receipt: 'warning',
  received:         'info',
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
  }

  if (!employee) return null

  const isWarehouse = employee.role === 'warehouse' || employee.role === 'manager'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">חלקים נדרשים</h3>
          {!adding && (
            <Button variant="ghost" onClick={() => setAdding(true)} className="text-primary">
              + הוסף חלק
            </Button>
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
        {requiredParts.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">אין עדיין חלקים נדרשים</p>
        ) : (
          <ul>
            {requiredParts.map((rp) => (
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
                  <div>
                    <span className="text-foreground">{w.parts?.name ?? w.part_sku}</span>
                    <span className="text-muted text-xs ms-2">×{w.quantity}</span>
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

// ---------- Add part form ----------

function AddPartForm({
  catalog,
  employeeNumber,
  callId,
  onDone,
  onCancel,
}: {
  catalog: { sku: string; name: string; quantity: number }[]
  employeeNumber: number
  callId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [sku, setSku] = useState(catalog[0]?.sku ?? '')
  const [quantity, setQuantity] = useState('1')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    const q = parseInt(quantity, 10)
    if (!sku || Number.isNaN(q) || q <= 0) {
      setError('בחר חלק וכמות תקינה')
      return
    }
    setBusy(true)
    const res = await addRequiredPart(employeeNumber, callId, sku, q)
    setBusy(false)
    if (!res.ok) {
      setError('שגיאה בהוספה')
      return
    }
    onDone()
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">חלק מהקטלוג</span>
        <select
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {catalog.map((p) => (
            <option key={p.sku} value={p.sku}>
              {p.name} ({p.sku}) — במלאי: {p.quantity}
            </option>
          ))}
        </select>
      </label>
      <Input
        label="כמות"
        name="quantity"
        type="number"
        inputMode="numeric"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        error={error ?? undefined}
      />
      <div className="flex gap-2">
        <Button onClick={submit} disabled={busy}>
          {busy ? 'מוסיף...' : 'הוסף'}
        </Button>
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
  const [withdrawingQty, setWithdrawingQty] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const nextStatus: Partial<Record<RequiredPartStatus, { next: RequiredPartStatus; label: string }>> = {
    awaiting_order:   { next: 'awaiting_receipt', label: 'הוזמן' },
    awaiting_receipt: { next: 'received',         label: 'התקבל' },
  }
  const action = nextStatus[row.status]
  const canWithdraw = isWarehouse && (row.status === 'in_stock' || row.status === 'received')

  async function advance() {
    if (!action) return
    setBusy(true)
    setError(null)
    const res = await updateRequiredPartStatus(employeeNumber, row.id, action.next)
    setBusy(false)
    if (!res.ok) { setError('שגיאה'); return }
    onChange()
  }

  async function withdraw() {
    setError(null)
    const q = parseInt(withdrawingQty, 10)
    if (Number.isNaN(q) || q <= 0) { setError('כמות לא תקינה'); return }
    setBusy(true)
    const res = await recordWithdrawal(
      employeeNumber, callId, row.part_sku, q, row.requested_by ?? employeeNumber,
    )
    setBusy(false)
    if (!res.ok) {
      setError(res.error === 'insufficient_stock'
        ? `במלאי רק ${res.available}`
        : 'שגיאה')
      return
    }
    setWithdrawingQty('')
    onChange()
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3 border-b border-border last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-sm text-foreground truncate">
            {row.parts?.name ?? row.part_sku}
          </span>
          <span className="text-xs text-muted">×{row.quantity}</span>
          <Badge tone={statusTone[row.status]}>{statusLabel[row.status]}</Badge>
        </div>

        {isWarehouse && action && (
          <Button onClick={advance} disabled={busy}>
            {busy ? '...' : action.label}
          </Button>
        )}
      </div>

      {canWithdraw && (
        <div className="flex items-end gap-2">
          <Input
            label="מסור כמות"
            name={`withdraw-${row.id}`}
            type="number"
            inputMode="numeric"
            value={withdrawingQty}
            onChange={(e) => setWithdrawingQty(e.target.value)}
            error={error ?? undefined}
            className="max-w-[6rem]"
          />
          <Button onClick={withdraw} disabled={busy || !withdrawingQty}>
            מסור לטכנאי
          </Button>
        </div>
      )}
    </li>
  )
}
