import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusBadgeMenu } from './StatusBadgeMenu'
import { CopyMenu } from './CopyMenu'
import type { CallRequiredPart } from '../types/parts'

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
  parts?: { name: string; sku: string; quantity: number; is_sku_blocked?: boolean; replacement_sku?: string | null } | null
  rejection_reason: string | null
  part_withdrawals?: Withdrawal[] | null
}

interface Props {
  row:        RowData
  highlight?: boolean
  /** True for the 'delivered' variant — shows the dispense location + date instead of the request date. */
  showWithdrawal?: boolean
  /** Returns the WhatsApp-format text for the row, or null when the
   *  data isn't ready yet (e.g. app_settings still loading). */
  copyFormatText?: () => string | null
  /** Optional extra control rendered next to the status badge. The
   *  not_consumed table uses it to host a "החזר למלאי" button. */
  trailingAction?: ReactNode
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

export function PendingActionRow({ row, highlight, showWithdrawal, copyFormatText, trailingAction }: Props) {
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
      {/* Top row: name (right, generous width) + sku (left) + copy menu */}
      <div className="flex items-baseline gap-3">
        <span className="text-base text-foreground font-medium truncate flex-1 min-w-0">{row.parts?.name ?? '?'}</span>
        {row.parts?.replacement_sku && row.parts.replacement_sku.trim() && isBlocked && (
          <span className="text-[11px] text-success bg-success/10 border border-success/30 rounded px-1.5 py-0.5 whitespace-nowrap" title="נקבע מק״ט חליפי">
            חליפי: <span className="font-mono">{row.parts.replacement_sku}</span>
          </span>
        )}
        <span className="font-mono text-xs text-muted shrink-0 whitespace-nowrap">{row.parts?.sku ?? ''}</span>
        <CopyMenu
          getText={{
            ...(copyFormatText ? { format: copyFormatText } : {}),
            sku:    () => row.parts?.sku ?? null,
            order:  () => row.order_number ?? null,
          }}
        />
      </div>

      {/* Bottom row: status + ×qty | date + "קישור לקריאה" */}
      <div className="flex items-center gap-2 mt-1.5 text-xs whitespace-nowrap">
        <StatusBadgeMenu
          rowId={row.id}
          partId={row.part_id}
          currentStatus={row.status}
          isSkuBlocked={isBlocked}
        />
        <span className="text-muted">×{row.quantity}</span>
        {trailingAction}
        <span className="ms-auto flex items-center gap-3">
          {showWithdrawal && wd ? (
            <>
              <span className="font-mono text-muted" title="תאריך הנפקה">{dispensedDate}</span>
              <span className="truncate max-w-[10rem] text-muted" title={dispensedLoc ?? ''}>{dispensedLoc}</span>
            </>
          ) : (
            <span className="font-mono text-muted" title="תאריך דרישה">{requestedDate}</span>
          )}
          {row.service_calls?.display_id && row.call_id && (
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

      {row.order_number && (
        <div className="text-[11px] text-muted truncate mt-1">מס׳ דרישה: <span className="font-mono">{row.order_number}</span></div>
      )}

      {row.rejection_reason && (
        <div className="text-[11px] text-danger truncate mt-1">סיבת דחייה: {row.rejection_reason}</div>
      )}
    </li>
  )
}
