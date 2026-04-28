import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { useAuthStore } from '../store/auth'
import { usePendingActions } from '../hooks/usePendingActions'
import { updateRequiredPartStatus } from '../lib/warehouseActions'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { RequiredPartStatus } from '../types/db'

const statusLabel: Record<RequiredPartStatus, string> = {
  in_stock:         'במלאי',
  awaiting_order:   'ממתין להזמנה',
  awaiting_receipt: 'ממתין לקבלה',
  received:         'התקבל',
}

const nextAction: Partial<Record<RequiredPartStatus, { next: RequiredPartStatus; label: string }>> = {
  awaiting_order:   { next: 'awaiting_receipt', label: 'סמן כמוזמן' },
  awaiting_receipt: { next: 'received',         label: 'סמן כהתקבל' },
}

export function PendingPartActions() {
  const employee = useAuthStore((s) => s.employee)!
  const { data, isLoading } = usePendingActions()
  const queryClient = useQueryClient()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function advance(id: string, next: RequiredPartStatus) {
    setBusyId(id)
    const res = await updateRequiredPartStatus(employee.employee_number, id, next)
    setBusyId(null)
    if (!res.ok) return
    queryClient.invalidateQueries({ queryKey: ['pending_parts_actions'] })
    queryClient.invalidateQueries({ queryKey: ['call_detail'] })
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
        {data && data.length === 0 && (
          <p className="text-sm text-muted text-center py-4">אין כרגע חלקים שצריך לטפל בהם</p>
        )}
        {data && data.length > 0 && (
          <ul>
            {data.map((row) => {
              const action = nextAction[row.status]
              return (
                <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border last:border-0">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-foreground truncate">
                        {row.parts?.name ?? row.part_sku}
                      </span>
                      <Badge tone="warning">{statusLabel[row.status]}</Badge>
                      <span className="text-xs text-muted">×{row.quantity}</span>
                    </div>
                    {row.service_calls?.display_id && (
                      <Link to={`/call/${row.call_id}`} className="text-xs text-primary">
                        עבור {row.service_calls.display_id} →
                      </Link>
                    )}
                  </div>
                  {action && (
                    <Button
                      onClick={() => advance(row.id, action.next)}
                      disabled={busyId === row.id}
                    >
                      {busyId === row.id ? 'מעדכן...' : action.label}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
