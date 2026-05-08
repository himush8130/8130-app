import { Link, useNavigate } from 'react-router-dom'
import { Badge } from './ui/Badge'
import type { CallRequiredPart } from '../types/parts'
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

interface Withdrawal {
  id:           string
  withdrawn_at: string
  is_external:  boolean
  parts:        {
    warehouse:      string | null
    cabinet:        number | null
    storage_type:   string | null
    storage_number: number | null
    cell_number:    number | null
  } | null
}

export interface RowData extends CallRequiredPart {
  service_calls?: { display_id: string; vehicle_number?: string | null } | null
  parts?: { name: string; sku: string; quantity: number; is_sku_blocked?: boolean } | null
  rejection_reason: string | null
  part_withdrawals?: Withdrawal[] | null
}

interface Props {
  row:        RowData
  highlight?: boolean
  /** True for the 'delivered' variant — shows the dispense location + date instead of the request date. */
  showWithdrawal?: boolean
  /** Quick-copy on part-name click. */
  onCopyName?:    (row: RowData) => void
  copied?:        boolean
}

function formatLoc(p: Withdrawal['parts']): string {
  if (!p) return '—'
  const out: string[] = []
  if (p.warehouse) out.push(p.warehouse)
  if (p.cabinet)        out.push(`ארון ${p.cabinet}`)
  if (p.storage_type)   out.push(p.storage_type)
  if (p.storage_number) out.push(`#${p.storage_number}`)
  if (p.cell_number)    out.push(`תא ${p.cell_number}`)
  return out.length === 0 ? '—' : out.join(' · ')
}

function formatDateShort(s: string): string {
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function PendingActionRow({ row, highlight, showWithdrawal, onCopyName, copied }: Props) {
  const navigate = useNavigate()
  const isBlocked = !!row.parts?.is_sku_blocked
  const wd = (row.part_withdrawals ?? [])[0]
  const requestedDate = formatDateShort(row.requested_at)
  const dispensedDate = wd ? formatDateShort(wd.withdrawn_at) : null
  const dispensedLoc  = wd ? (wd.is_external ? 'מלאי חיצוני' : formatLoc(wd.parts)) : null

  const detailHref = `/warehouse/required-part/${row.id}`

  function openDetail() {
    navigate(detailHref)
  }

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail() }
      }}
      className={`block px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted-surface ${highlight ? 'bg-danger/5 hover:bg-danger/10' : ''}`}
    >
      {/* Top row: name (right, generous width) + sku (left) */}
      <div className="flex items-baseline gap-3">
        {onCopyName ? (
          <span
            role="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCopyName(row) }}
            title="לחץ להעתקת תקציר"
            className="text-base text-foreground font-medium truncate flex-1 min-w-0 cursor-pointer hover:underline"
          >
            {row.parts?.name ?? '?'}{copied && <span className="text-success ms-1 text-xs">✓ הועתק</span>}
          </span>
        ) : (
          <span className="text-base text-foreground font-medium truncate flex-1 min-w-0">{row.parts?.name ?? '?'}</span>
        )}
        <span className="font-mono text-xs text-muted shrink-0 whitespace-nowrap">{row.parts?.sku ?? ''}</span>
      </div>

      {/* Bottom row: status + ×qty | date + "קישור לקריאה" */}
      <div className="flex items-center gap-2 mt-1.5 text-xs whitespace-nowrap">
        {isBlocked
          ? <Badge tone="warning">⚠ מק״ט חסום</Badge>
          : <Badge tone={statusTone[row.status]}>{statusLabel[row.status]}</Badge>}
        <span className="text-muted">×{row.quantity}</span>
        <span className="ms-auto flex items-center gap-3">
          {showWithdrawal && wd ? (
            <>
              <span className="font-mono text-muted" title="תאריך הנפקה">{dispensedDate}</span>
              <span className="truncate max-w-[10rem] text-muted" title={dispensedLoc ?? ''}>{dispensedLoc}</span>
            </>
          ) : (
            <span className="font-mono text-muted" title="תאריך דרישה">{requestedDate}</span>
          )}
          {row.service_calls?.display_id && (
            <Link
              to={`/call/${row.call_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-primary hover:underline"
              title={row.service_calls.display_id}
            >
              קישור לקריאה →
            </Link>
          )}
        </span>
      </div>

      {row.rejection_reason && (
        <div className="text-[11px] text-danger truncate mt-1">סיבת דחייה: {row.rejection_reason}</div>
      )}
    </li>
  )
}
