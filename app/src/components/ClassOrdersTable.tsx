import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAllClassOrders, type ClassOrderWithCall } from '../hooks/useClassOrders'
import { useAuthStore } from '../store/auth'
import { deleteClassOrder } from '../lib/adminActions'
import { CollapsibleSection } from './CollapsibleSection'
import { Button } from './ui/Button'

function formatDateForOutput(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted-surface text-xs text-muted">
              <tr>
                <th className="text-start px-3 py-2">קריאה</th>
                <th className="text-start px-3 py-2">כלי</th>
                <th className="text-start px-3 py-2">כיתה</th>
                <th className="text-start px-3 py-2">תאריך</th>
                <th className="text-start px-3 py-2">חציית גבל</th>
                <th className="text-start px-3 py-2">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => <Row key={o.id} order={o} />)}
            </tbody>
          </table>
        </div>
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
    <tr className="border-t border-border">
      <td className="px-3 py-2">
        <Link to={`/call/${order.call_id}`} className="text-primary hover:underline font-mono">
          {order.service_calls?.display_id ?? '—'}
        </Link>
      </td>
      <td className="px-3 py-2 font-mono">{order.vehicle_number ?? '—'}</td>
      <td className="px-3 py-2">{order.class_required}</td>
      <td className="px-3 py-2 font-mono">{formatDateForOutput(order.target_date)}</td>
      <td className="px-3 py-2 text-xs">
        {order.crossing_gvul === 'yes' ? 'חוצה גבל' : 'ללא חציית גבל'}
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1.5 items-center flex-wrap">
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
      </td>
    </tr>
  )
}
