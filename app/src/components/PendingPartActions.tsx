import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuthStore } from '../store/auth'
import { usePendingActions } from '../hooks/usePendingActions'
import {
  recordWithdrawal,
  updateRequiredPartStatus,
} from '../lib/warehouseActions'
import { CollapsibleSection } from './CollapsibleSection'
import { PendingActionRow, type RowData } from './PendingActionRow'
import type { RequiredPartStatus } from '../types/db'

const REJECTED_SET: ReadonlySet<RequiredPartStatus> = new Set([
  'rejected', 'pending_special_approval', 'rejected_final',
])

interface Props {
  /** When true, render only the rejected subset; otherwise only active. */
  rejectedOnly?: boolean
  defaultOpen?:  boolean
}

/**
 * Renders ONE table — either the active pending-action rows or the
 * rejected ones. Both pull from the same hook so we don't double-fetch.
 */
export function PendingPartActions({ rejectedOnly = false, defaultOpen = false }: Props) {
  const employee = useAuthStore((s) => s.employee)!
  const { data, isLoading } = usePendingActions()
  const queryClient = useQueryClient()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError]   = useState<string | null>(null)

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['pending_parts_actions'] })
    queryClient.invalidateQueries({ queryKey: ['parts'] })
    queryClient.invalidateQueries({ queryKey: ['call_detail'] })
    queryClient.invalidateQueries({ queryKey: ['calls_parts_status'] })
    queryClient.invalidateQueries({ queryKey: ['service_calls'] })
  }

  async function advance(id: string, next: RequiredPartStatus) {
    setBusyId(id); setError(null)
    const res = await updateRequiredPartStatus(employee.employee_number, id, next)
    setBusyId(null)
    if (!res.ok) { setError('שגיאה'); return }
    refresh()
  }

  async function deliver(row: RowData) {
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

  const rows = (data ?? []).filter((r) =>
    rejectedOnly ? REJECTED_SET.has(r.status) : !REJECTED_SET.has(r.status),
  )

  const title    = rejectedOnly ? 'מק״טים שנדחו' : 'פעולות פתוחות'
  const badgeId  = rejectedOnly ? 4008 : 4003
  const tone     = rejectedOnly ? 'text-danger' : undefined

  return (
    <CollapsibleSection
      title={title}
      count={rows.length}
      defaultOpen={defaultOpen}
      badgeId={badgeId}
      countTone={tone}
    >
      {isLoading && <p className="text-sm text-muted text-center py-4">טוען...</p>}
      {error && <p className="text-xs text-danger text-center py-2">{error}</p>}
      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-muted text-center py-4">
          {rejectedOnly ? 'אין פריטים שנדחו' : 'אין כרגע חלקים שצריך לטפל בהם'}
        </p>
      )}
      {rows.length > 0 && (
        <ul>
          {rows.map((row) => (
            <PendingActionRow
              key={row.id}
              row={row}
              busyId={busyId}
              employeeNumber={employee.employee_number}
              onAdvance={advance}
              onDeliver={deliver}
              onChanged={refresh}
              highlight={rejectedOnly}
            />
          ))}
        </ul>
      )}
    </CollapsibleSection>
  )
}
