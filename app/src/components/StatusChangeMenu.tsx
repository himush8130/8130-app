import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { updateRequiredPartStatus, updatePart } from '../lib/warehouseActions'
import type { RequiredPartStatus } from '../types/db'

const ALL_LABELS: Record<RequiredPartStatus, string> = {
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

// Statuses we surface in the manual override menu. `delivered` is
// intentionally excluded — the proper way to deliver is via "מסור
// לטכנאי" so a withdrawal row gets recorded and stock is deducted.
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
  employeeNumber:  number
  onChanged:       () => void
}

export function StatusChangeMenu({
  rowId, partId, currentStatus, isSkuBlocked, employeeNumber, onChanged,
}: Props) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function setStatus(s: RequiredPartStatus) {
    let reason: string | null = null
    if (s === 'rejected') {
      // Optional free-text reason. If user cancels prompt, abort.
      const r = window.prompt('סיבת הדחייה (אופציונלי):', '')
      if (r === null) return  // cancelled
      reason = r.trim() || null
    }
    setBusy(true)
    // If the part is currently blocked, picking any concrete status
    // implies "the part is back in flow" — clear the SKU block too.
    if (isSkuBlocked) {
      await updatePart(employeeNumber, partId, { is_sku_blocked: false })
    }
    await updateRequiredPartStatus(employeeNumber, rowId, s, reason)
    setBusy(false)
    setOpen(false)
    if (isSkuBlocked) {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['parts'] }),
        queryClient.refetchQueries({ queryKey: ['pending_parts_actions'] }),
      ])
    }
    onChanged()
  }

  async function toggleBlocked() {
    setBusy(true)
    await updatePart(employeeNumber, partId, { is_sku_blocked: !isSkuBlocked })
    setBusy(false)
    setOpen(false)
    // Explicit refetch (not just invalidate) so the BlockedSkuTable on
    // the warehouse home re-renders with the freshly-flagged part
    // immediately, instead of waiting for the next reactive cycle.
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['parts'] }),
      queryClient.refetchQueries({ queryKey: ['pending_parts_actions'] }),
    ])
    onChanged()
  }

  return (
    <div className="flex flex-col items-stretch">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="text-xs px-3 py-1 min-w-[7rem] rounded-md border border-border bg-card text-foreground hover:bg-muted-surface disabled:opacity-60"
      >
        שנה סטטוס {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className="mt-1 bg-card border border-border rounded-md shadow-sm p-1 flex flex-col gap-0.5 min-w-[10rem]">
          {MENU_STATUSES
            .filter((s) => s !== currentStatus)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                disabled={busy}
                className="text-xs text-start px-2 py-1.5 rounded hover:bg-muted-surface text-foreground disabled:opacity-60"
              >
                {ALL_LABELS[s]}
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
    </div>
  )
}
