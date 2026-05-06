import { Link } from 'react-router-dom'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { StatusChangeMenu } from './StatusChangeMenu'
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

export interface RowData extends CallRequiredPart {
  service_calls?: { display_id: string } | null
  parts?: { name: string; sku: string; quantity: number; is_sku_blocked?: boolean } | null
}

interface Props {
  row:             RowData
  busyId:          string | null
  employeeNumber:  number
  onAdvance:       (id: string, next: RequiredPartStatus) => void
  onDeliver:       (row: RowData) => void
  onChanged:       () => void
  highlight?:      boolean   // tints the row background (e.g. for rejected lists)
}

export function PendingActionRow({
  row, busyId, employeeNumber, onAdvance, onDeliver, onChanged, highlight,
}: Props) {
  const canDeliver = row.status === 'in_stock' || row.status === 'received'
  const advanceMap: Partial<Record<RequiredPartStatus, { next: RequiredPartStatus; label: string }>> = {
    awaiting_order:   { next: 'awaiting_receipt',         label: 'סמן כמוזמן' },
    awaiting_receipt: { next: 'received',                 label: 'סמן כהתקבל' },
    rejected:         { next: 'pending_special_approval', label: 'לאישור מיוחד' },
  }
  const action = advanceMap[row.status]

  return (
    <li className={`flex items-center justify-between gap-3 px-4 py-2 border-b border-border last:border-0 ${highlight ? 'bg-danger/5' : ''}`}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-foreground truncate">
            {row.parts?.name ?? '?'}
          </span>
          <span className="font-mono text-[11px] text-muted">
            {row.parts?.sku ?? ''}
          </span>
          {row.parts?.is_sku_blocked
            ? <Badge tone="warning">⚠ מק״ט חסום</Badge>
            : <Badge tone={statusTone[row.status]}>{statusLabel[row.status]}</Badge>}
          <span className="text-xs text-muted">×{row.quantity}</span>
        </div>
        {row.service_calls?.display_id && (
          <Link to={`/call/${row.call_id}`} className="text-xs text-primary">
            עבור {row.service_calls.display_id} →
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-1 items-stretch">
        {canDeliver && (
          <Button
            onClick={() => onDeliver(row)}
            disabled={busyId === row.id}
            className={`text-xs px-3 py-1 min-w-[7rem] ${
              row.status === 'in_stock'
                ? 'bg-success hover:bg-success/90 text-white'
                : 'bg-info hover:bg-info/90 text-white'
            }`}
          >
            {busyId === row.id ? '...' : 'מסור לטכנאי'}
          </Button>
        )}
        {!canDeliver && action && (
          <Button
            onClick={() => onAdvance(row.id, action.next)}
            disabled={busyId === row.id}
            className={`text-xs px-3 py-1 min-w-[7rem] ${
              row.status === 'awaiting_order' ? 'bg-danger hover:bg-danger/90 text-white'
                : row.status === 'awaiting_receipt' ? 'bg-warning hover:bg-warning/90 text-white'
                : row.status === 'rejected' ? 'bg-warning hover:bg-warning/90 text-white'
                : ''
            }`}
          >
            {busyId === row.id ? '...' : action.label}
          </Button>
        )}
        <StatusChangeMenu
          rowId={row.id}
          partId={row.part_id}
          currentStatus={row.status}
          isSkuBlocked={!!row.parts?.is_sku_blocked}
          employeeNumber={employeeNumber}
          onChanged={onChanged}
        />
      </div>
    </li>
  )
}
