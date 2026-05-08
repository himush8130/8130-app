import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { supabase } from '../lib/supabase'
import { updateRequiredPartStatus, updatePart, type ReceiveDestination } from '../lib/warehouseActions'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import type { RequiredPartStatus } from '../types/db'
import type { Part } from '../types/parts'

const LABELS: Record<RequiredPartStatus, string> = {
  awaiting_order:           'ממתין להזמנה',
  awaiting_receipt:         'ממתין לקבלה',
  received:                 'התקבל',
  in_stock:                 'במלאי',
  delivered:                'נמסר',
  rejected:                 'נדחה',
  pending_special_approval: 'לאישור מיוחד',
  rejected_final:           'נדחה סופית',
}
const TONE: Record<RequiredPartStatus, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  in_stock:                 'success',
  awaiting_order:           'danger',
  awaiting_receipt:         'warning',
  received:                 'info',
  delivered:                'neutral',
  rejected:                 'danger',
  pending_special_approval: 'warning',
  rejected_final:           'neutral',
}

// `delivered` is intentionally NOT here. The proper way to mark a row
// as delivered is via "מסור לטכנאי" so a withdrawal is recorded. The
// menu is for corrections / status changes that don't move stock.
const MENU_STATUSES: RequiredPartStatus[] = [
  'awaiting_order',
  'awaiting_receipt',
  'received',
  'in_stock',
  'rejected',
  'pending_special_approval',
  'rejected_final',
]

interface Props {
  rowId:           string
  partId:          string
  currentStatus:   RequiredPartStatus
  isSkuBlocked:    boolean
  /** Optional extra refresh hook called after a status change. */
  onChanged?:      () => void
}

export function StatusBadgeMenu({
  rowId, partId, currentStatus, isSkuBlocked, onChanged,
}: Props) {
  const employee = useAuthStore((s) => s.employee)
  const canChange = employee?.permissions === 'warehouse' || employee?.permissions === 'manager'
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function refreshAll() {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['pending_parts_actions'] }),
      queryClient.refetchQueries({ queryKey: ['parts'] }),
      queryClient.refetchQueries({ queryKey: ['required_part_detail', rowId] }),
    ])
    queryClient.invalidateQueries({ queryKey: ['call_detail'] })
    queryClient.invalidateQueries({ queryKey: ['service_calls'] })
    queryClient.invalidateQueries({ queryKey: ['calls_parts_status'] })
    onChanged?.()
  }

  async function setStatus(s: RequiredPartStatus, receive?: ReceiveDestination) {
    if (!employee) return
    let reason: string | null = null
    if (s === 'rejected') {
      const r = window.prompt('סיבת הדחייה (אופציונלי):', '')
      if (r === null) return
      reason = r.trim() || null
    }
    // ANY transition into 'received' (from any other status) opens the
    // destination dialog so the warehouse picks where the goods land.
    if (s === 'received' && currentStatus !== 'received' && !receive) {
      setOpen(false)
      setReceiveOpen(true)
      return
    }
    setBusy(true)
    if (isSkuBlocked) {
      await updatePart(employee.employee_number, partId, { is_sku_blocked: false })
    }
    await updateRequiredPartStatus(employee.employee_number, rowId, s, reason, receive)
    setOpen(false)
    setReceiveOpen(false)
    await refreshAll()
    setBusy(false)
  }

  async function toggleBlocked() {
    if (!employee) return
    setBusy(true)
    await updatePart(employee.employee_number, partId, { is_sku_blocked: !isSkuBlocked })
    setOpen(false)
    await refreshAll()
    setBusy(false)
  }

  // Read-only for users without permission.
  if (!canChange) {
    return isSkuBlocked
      ? <Badge tone="warning">⚠ מק״ט חסום</Badge>
      : <Badge tone={TONE[currentStatus]}>{LABELS[currentStatus]}</Badge>
  }

  return (
    <span ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v) }}
        disabled={busy}
        title="לחץ לשינוי סטטוס"
        className="cursor-pointer disabled:opacity-60"
      >
        {isSkuBlocked
          ? <Badge tone="warning">⚠ מק״ט חסום ▾</Badge>
          : <Badge tone={TONE[currentStatus]}>{LABELS[currentStatus]} ▾</Badge>}
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full start-0 mt-1 z-30 bg-card border border-border rounded-md shadow-lg p-1 min-w-[11rem] flex flex-col gap-0.5"
        >
          {MENU_STATUSES.filter((s) => s !== currentStatus).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              disabled={busy}
              className="text-xs text-start px-2 py-1.5 rounded hover:bg-muted-surface text-foreground disabled:opacity-60"
            >
              {LABELS[s]}
            </button>
          ))}
          <div className="border-t border-border mt-1 pt-1">
            <button
              type="button"
              onClick={toggleBlocked}
              disabled={busy}
              className="text-xs text-start px-2 py-1.5 rounded hover:bg-warning/10 text-warning w-full disabled:opacity-60"
            >
              {isSkuBlocked ? 'בטל סימון מק״ט חסום' : 'סמן כמק״ט חסום'}
            </button>
          </div>
        </div>
      )}

      {receiveOpen && (
        <ReceiveDestinationDialog
          partId={partId}
          busy={busy}
          onClose={() => setReceiveOpen(false)}
          onConfirm={(dest) => setStatus('received', dest)}
        />
      )}
    </span>
  )
}

// ---------- receive-destination dialog ----------

const EXTERNAL = '__external__'
const NEW      = '__new__'

function ReceiveDestinationDialog({
  partId, busy, onClose, onConfirm,
}: {
  partId:    string
  busy:      boolean
  onClose:   () => void
  onConfirm: (dest: ReceiveDestination) => void
}) {
  // Pull all parts rows that share the SKU of the row's part_id.
  const { data: locations } = useQuery({
    queryKey: ['parts_same_sku', partId],
    queryFn: async (): Promise<Part[]> => {
      const { data: orig } = await supabase.from('parts').select('sku').eq('id', partId).maybeSingle()
      if (!orig?.sku) return []
      const { data: rows } = await supabase.from('parts').select('*').eq('sku', orig.sku).order('warehouse')
      return (rows ?? []) as Part[]
    },
  })

  const [pick, setPick] = useState<string>('')
  const [warehouse, setWarehouse] = useState('')
  const [cabinet, setCabinet] = useState('')
  const [storageType, setStorageType] = useState('')
  const [storageNumber, setStorageNumber] = useState('')
  const [cellNumber, setCellNumber] = useState('')

  function nullableInt(v: string): number | null {
    const t = v.trim()
    if (!t) return null
    const n = parseInt(t, 10)
    return Number.isNaN(n) ? null : n
  }

  function submit() {
    if (!pick) return
    if (pick === EXTERNAL) { onConfirm({ receive_to: 'external' }); return }
    if (pick === NEW) {
      onConfirm({
        receive_to: 'new',
        receive_new_location: {
          warehouse:      warehouse.trim() || null,
          cabinet:        nullableInt(cabinet),
          storage_type:   storageType.trim() || null,
          storage_number: nullableInt(storageNumber),
          cell_number:    nullableInt(cellNumber),
        },
      })
      return
    }
    onConfirm({ receive_to: 'existing', receive_part_id: pick })
  }

  function locLabel(p: Part): string {
    const out: string[] = []
    if (p.warehouse) out.push(p.warehouse)
    if (p.cabinet)        out.push(`ארון ${p.cabinet}`)
    if (p.storage_type)   out.push(p.storage_type)
    if (p.storage_number) out.push(`#${p.storage_number}`)
    if (p.cell_number)    out.push(`תא ${p.cell_number}`)
    return out.length === 0 ? '—' : out.join(' · ')
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
    >
      <div className="bg-card border border-border rounded-md shadow-xl p-4 w-full max-w-md max-h-full overflow-y-auto flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground">איפה להוסיף את הפריט שהתקבל?</h3>

        <ul className="flex flex-col gap-1">
          {(locations ?? []).map((loc) => (
            <li key={loc.id}>
              <label className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer ${
                pick === loc.id ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <input type="radio" name="dest" checked={pick === loc.id} onChange={() => setPick(loc.id)} />
                <span className="flex-1 text-sm text-foreground">{locLabel(loc)}</span>
                <span className="text-xs text-muted">קיים: {loc.quantity}</span>
              </label>
            </li>
          ))}
          <li>
            <label className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer ${
              pick === EXTERNAL ? 'border-primary bg-primary/5' : 'border-border'
            }`}>
              <input type="radio" name="dest" checked={pick === EXTERNAL} onChange={() => setPick(EXTERNAL)} />
              <span className="flex-1 text-sm text-foreground">מלאי חיצוני</span>
              <span className="text-xs text-muted">בלי לעדכן מלאי פנימי</span>
            </label>
          </li>
          <li>
            <label className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer ${
              pick === NEW ? 'border-primary bg-primary/5' : 'border-border'
            }`}>
              <input type="radio" name="dest" checked={pick === NEW} onChange={() => setPick(NEW)} />
              <span className="flex-1 text-sm text-foreground">מיקום חדש</span>
            </label>
          </li>
        </ul>

        {pick === NEW && (
          <div className="grid grid-cols-2 gap-2 border border-border rounded-md p-3 bg-muted-surface/40">
            <Input label="מחסן"        name="rw"  value={warehouse}     onChange={(e) => setWarehouse(e.target.value)} />
            <Input label="ארון"        name="rc"  value={cabinet}       onChange={(e) => setCabinet(e.target.value)} type="number" />
            <Input label="סוג מאחסן"   name="rst" value={storageType}   onChange={(e) => setStorageType(e.target.value)} />
            <Input label="מספר מאחסן"  name="rsn" value={storageNumber} onChange={(e) => setStorageNumber(e.target.value)} type="number" />
            <Input label="מספר תא"     name="rcn" value={cellNumber}    onChange={(e) => setCellNumber(e.target.value)} type="number" />
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={busy}>ביטול</Button>
          <Button onClick={submit} disabled={busy || !pick}>{busy ? '...' : 'אשר קבלה'}</Button>
        </div>
      </div>
    </div>
  )
}
