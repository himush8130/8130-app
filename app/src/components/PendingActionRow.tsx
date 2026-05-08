import { Link } from 'react-router-dom'
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
  /** True for the 'delivered' variant — shows the dispense location + date instead of a request date. */
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
  const isBlocked = !!row.parts?.is_sku_blocked
  const wd = (row.part_withdrawals ?? [])[0]
  const requestedDate = formatDateShort(row.requested_at)
  const dispensedDate = wd ? formatDateShort(wd.withdrawn_at) : null
  const dispensedLoc  = wd ? (wd.is_external ? 'מלאי חיצוני' : formatLoc(wd.parts)) : null

  const detailHref = `/warehouse/required-part/${row.id}`

  return (
    <li className={`flex items-stretch border-b border-border last:border-0 ${highlight ? 'bg-danger/5' : ''}`}>
      <Link
        to={detailHref}
        className="flex-1 min-w-0 flex flex-col gap-0.5 px-4 py-2 hover:bg-muted-surface"
      >
        <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
          {onCopyName ? (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCopyName(row) }}
              title="לחץ להעתקת תקציר"
              className="text-sm text-foreground hover:underline truncate text-start"
            >
              {row.parts?.name ?? '?'}{copied && <span className="text-success ms-1">✓</span>}
            </button>
          ) : (
            <span className="text-sm text-foreground truncate">{row.parts?.name ?? '?'}</span>
          )}
          <span className="font-mono text-[11px] text-muted">{row.parts?.sku ?? ''}</span>
          {isBlocked
            ? <Badge tone="warning">⚠ מק״ט חסום</Badge>
            : <Badge tone={statusTone[row.status]}>{statusLabel[row.status]}</Badge>}
          <span className="text-xs text-muted">×{row.quantity}</span>
        </div>
        {row.service_calls?.display_id && (
          <span className="text-[11px] text-primary truncate">
            עבור {row.service_calls.display_id} →
          </span>
        )}
        {row.rejection_reason && (
          <span className="text-[11px] text-danger truncate">סיבת דחייה: {row.rejection_reason}</span>
        )}
      </Link>
      <div className="shrink-0 flex flex-col items-end justify-center gap-0.5 px-4 py-2 text-[11px] text-muted whitespace-nowrap">
        {showWithdrawal && wd ? (
          <>
            <span className="font-mono">{dispensedDate}</span>
            <span className="truncate max-w-[10rem]" title={dispensedLoc ?? ''}>{dispensedLoc}</span>
          </>
        ) : (
          <span className="font-mono" title="תאריך דרישה">{requestedDate}</span>
        )}
      </div>
    </li>
  )
}
