import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { useAuthStore } from '../store/auth'
import { usePendingActions } from '../hooks/usePendingActions'
import {
  recordWithdrawal,
  updateRequiredPartStatus,
} from '../lib/warehouseActions'
import { ComponentBadge } from '../feedback/ComponentBadge'
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

export function PendingPartActions() {
  const employee = useAuthStore((s) => s.employee)!
  const { data, isLoading } = usePendingActions()
  const queryClient = useQueryClient()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRejected, setShowRejected] = useState(false)

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['pending_parts_actions'] })
    queryClient.invalidateQueries({ queryKey: ['call_detail'] })
    queryClient.invalidateQueries({ queryKey: ['parts'] })
  }

  async function advance(id: string, next: RequiredPartStatus) {
    setBusyId(id); setError(null)
    const res = await updateRequiredPartStatus(employee.employee_number, id, next)
    setBusyId(null)
    if (!res.ok) { setError('שגיאה'); return }
    refresh()
  }

  async function deliver(row: NonNullable<typeof data>[number]) {
    setBusyId(row.id); setError(null)
    const res = await recordWithdrawal(
      employee.employee_number,
      row.call_id,
      row.part_id,
      row.quantity,
      row.requested_by ?? employee.employee_number,
      row.id,
    )
    setBusyId(null)
    if (!res.ok) {
      setError(
        res.error === 'insufficient_stock'
          ? `במלאי רק ${res.available}`
          : 'שגיאה',
      )
      return
    }
    refresh()
  }

  return (
    <Card>
      <CardHeader>
        <ComponentBadge id={4003} />
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">פעולות פתוחות</h3>
          <span className="text-xs text-muted">{data?.length ?? 0}</span>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {isLoading && <p className="text-sm text-muted text-center py-4">טוען...</p>}
        {error && <p className="text-xs text-danger text-center pb-2">{error}</p>}
        {data && data.length === 0 && (
          <p className="text-sm text-muted text-center py-4">אין כרגע חלקים שצריך לטפל בהם</p>
        )}

        {data && data.length > 0 && (() => {
          const REJECTED_STATUSES: RequiredPartStatus[] =
            ['rejected', 'pending_special_approval', 'rejected_final']
          const active   = data.filter((r) => !REJECTED_STATUSES.includes(r.status))
          const rejected = data.filter((r) =>  REJECTED_STATUSES.includes(r.status))

          return (
            <>
              {active.length > 0 && (
                <ul>
                  {active.map((row) => renderRow(row, 'active'))}
                </ul>
              )}
              {active.length === 0 && (
                <p className="text-sm text-muted text-center py-3">אין פעולות פעילות</p>
              )}

              {rejected.length > 0 && (
                <div className="border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowRejected((v) => !v)}
                    className="w-full text-start px-4 py-2 text-sm text-danger hover:bg-muted-surface flex items-center justify-between"
                  >
                    <span>{showRejected ? 'הסתר' : 'הצג'} פריטים שנדחו ({rejected.length})</span>
                    <span>{showRejected ? '▲' : '▼'}</span>
                  </button>
                  {showRejected && (
                    <ul>
                      {rejected.map((row) => renderRow(row, 'rejected'))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )

          function renderRow(row: typeof active[number], kind: 'active' | 'rejected') {
            const canDeliver = row.status === 'in_stock' || row.status === 'received'
            const advanceMap: Partial<Record<RequiredPartStatus, { next: RequiredPartStatus; label: string }>> = {
              awaiting_order:   { next: 'awaiting_receipt', label: 'סמן כמוזמן' },
              awaiting_receipt: { next: 'received',         label: 'סמן כהתקבל' },
            }
            const action = advanceMap[row.status]
            const canReject = row.status === 'awaiting_order' || row.status === 'awaiting_receipt'

            return (
              <li
                key={row.id}
                className={`flex items-center justify-between gap-3 px-4 py-2 border-b border-border last:border-0 ${kind === 'rejected' ? 'bg-danger/5' : ''}`}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-foreground truncate">
                      {row.parts?.name ?? '?'}
                    </span>
                    <span className="font-mono text-[11px] text-muted">
                      {row.parts?.sku ?? ''}
                    </span>
                    <Badge tone={statusTone[row.status]}>{statusLabel[row.status]}</Badge>
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
                      onClick={() => deliver(row)}
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
                      onClick={() => advance(row.id, action.next)}
                      disabled={busyId === row.id}
                      className={`text-xs px-3 py-1 min-w-[7rem] ${
                        row.status === 'awaiting_order'
                          ? 'bg-danger hover:bg-danger/90 text-white'
                          : 'bg-warning hover:bg-warning/90 text-white'
                      }`}
                    >
                      {busyId === row.id ? '...' : action.label}
                    </Button>
                  )}
                  {canReject && (
                    <button
                      type="button"
                      onClick={() => advance(row.id, 'rejected')}
                      disabled={busyId === row.id}
                      className="text-[11px] text-danger underline disabled:opacity-50 text-center"
                    >
                      סמן כנדחה
                    </button>
                  )}
                  {row.status === 'rejected' && (
                    <>
                      <Button
                        onClick={() => advance(row.id, 'pending_special_approval')}
                        disabled={busyId === row.id}
                        className="text-xs px-3 py-1 min-w-[7rem] bg-warning hover:bg-warning/90 text-white"
                      >
                        לאישור מיוחד
                      </Button>
                      <Button
                        onClick={() => advance(row.id, 'rejected_final')}
                        disabled={busyId === row.id}
                        className="text-xs px-3 py-1 min-w-[7rem] bg-muted-surface text-foreground border border-border"
                      >
                        נדחה סופית
                      </Button>
                    </>
                  )}
                </div>
              </li>
            )
          }
        })()}
      </CardBody>
    </Card>
  )
}
