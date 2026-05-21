import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { updateRequiredPartStatus, updatePart, type ReceiveDestination } from '../lib/warehouseActions'
import { ReceiveDestinationDialog } from './ReceiveDestinationDialog'
import { Badge } from './ui/Badge'
import type { RequiredPartStatus } from '../types/db'

const LABELS: Record<RequiredPartStatus, string> = {
  awaiting_order:           'ממתין להזמנה',
  awaiting_receipt:         'ממתין לקבלה',
  received:                 'התקבל',
  in_stock:                 'במלאי',
  delivered:                'נמסר',
  rejected:                 'נדחה',
  pending_special_approval: 'לאישור מיוחד',
  rejected_final:           'נדחה סופית',
  not_consumed:             'לא נצרך',
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
  not_consumed:             'warning',
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
  'not_consumed',
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

