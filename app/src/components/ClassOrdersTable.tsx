import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAllClassOrders, type ClassOrderWithCall } from '../hooks/useClassOrders'
import { useAuthStore } from '../store/auth'
import { deleteClassOrder } from '../lib/adminActions'
import { CollapsibleSection } from './CollapsibleSection'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'

function formatDateForOutput(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Compact DD/MM rendering for the in-card date chip. */
function formatDateShort(iso: string | null): string {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function buildText(o: ClassOrderWithCall): string {
  return [
    '*פורמט דרישת כיתות אחזקה*',
    `צק״ח: ${o.tsakah ?? ''}`,
    `סוג צלם: ${o.model ?? ''}`,
    `כיתה נדרשת: ${o.class_required}`,
    `צ': ${o.vehicle_number ?? ''}`,
    '',
    'תקלה:',
    o.fault ?? '',
    '',
    `חלקים יש / אין: ${o.parts_available ?? ''}`,
    '',
    `תאריך: ${formatDateForOutput(o.target_date)}`,
    `מיקום : ${o.location ?? ''}`,
    `איש קשר: ${o.contact_name ?? ''}`,
    `מס' פלאפון: ${o.contact_phone ?? ''}`,
    '',
    o.crossing_gvul === 'yes' ? '*חוצה גבל*' : '*ללא חציית גבל*',
  ].join('\n')
}

export function ClassOrdersTable() {
  const { data, isLoading } = useAllClassOrders()
  const rows = data ?? []

  return (
    <CollapsibleSection
      title="דרישות כיתות אחזקה"
      count={rows.length}
      badgeId={3032}
      defaultOpen={rows.length > 0}
    >
      {isLoading ? (
        <p className="text-sm text-muted text-center py-4">טוען...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">אין דרישות פתוחות</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((o) => <Row key={o.id} order={o} />)}
        </ul>
      )}
    </CollapsibleSection>
  )
}

function Row({ order }: { order: ClassOrderWithCall }) {
  const employee = useAuthStore((s) => s.employee)!
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function copy() {
    setError(null)
    try {
      await navigator.clipboard.writeText(buildText(order))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('העתקה נכשלה')
    }
  }

  async function remove() {
    setBusy(true); setError(null)
    const res = await deleteClassOrder(employee.employee_number, order.id)
    setBusy(false)
    if (!res.ok) { setError('מחיקה נכשלה'); return }
    queryClient.invalidateQueries({ queryKey: ['class_orders'] })
    queryClient.invalidateQueries({ queryKey: ['class_order', order.call_id] })
  }

  return (
    <li className="border-t border-border first:border-t-0 p-3 flex flex-col gap-2">
      {/* Header row: call link + vehicle on the right, crossing-gvul chip on the left */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs min-w-0 flex-wrap">
          <Link
            to={`/call/${order.call_id}`}
            className="text-primary hover:underline font-mono whitespace-nowrap"
          >
            {order.service_calls?.display_id ?? '—'}
          </Link>
          {order.vehicle_number && (
            <span className="font-mono text-muted whitespace-nowrap">· {order.vehicle_number}</span>
          )}
        </div>
        <span className="shrink-0">
          <Badge tone={order.crossing_gvul === 'yes' ? 'warning' : 'neutral'}>
            <span className="whitespace-nowrap">
              {order.crossing_gvul === 'yes' ? 'חוצה גבל' : 'ללא חציית גבל'}
            </span>
          </Badge>
        </span>
      </div>

      {/* Content + actions: כיתה · DD/MM on the right, action buttons on the left */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-foreground min-w-0 break-words">
          <span className="font-semibold">{order.class_required}</span>
          <span className="font-mono text-muted whitespace-nowrap"> · {formatDateShort(order.target_date)}</span>
        </div>
        <div className="flex gap-2 items-center flex-wrap shrink-0">
          <Button onClick={copy} className="text-xs px-3 py-1">
            {copied ? '✓ הועתק' : 'העתק טקסט'}
          </Button>
          {!confirmDelete ? (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="text-xs px-3 py-1">מחק</Button>
          ) : (
            <>
              <Button onClick={remove} disabled={busy} className="text-xs px-3 py-1">
                {busy ? '...' : 'אשר מחיקה'}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-1">בטל</Button>
            </>
          )}
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>
      </div>
    </li>
  )
}
