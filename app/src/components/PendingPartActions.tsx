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

const PENDING_REJECTED_SET: ReadonlySet<RequiredPartStatus> = new Set([
  'rejected', 'pending_special_approval',
])
const FINAL_REJECTED_SET: ReadonlySet<RequiredPartStatus> = new Set([
  'rejected_final',
])
const ANY_REJECTED_SET: ReadonlySet<RequiredPartStatus> = new Set([
  ...PENDING_REJECTED_SET, ...FINAL_REJECTED_SET,
])

type Variant = 'active' | 'rejected' | 'rejected_final'

interface Props {
  /** Which subset to render. Default `active`. */
  variant?:     Variant
  defaultOpen?: boolean
  /** Legacy prop kept for backward compat — true → variant='rejected'. */
  rejectedOnly?: boolean
}

/**
 * Renders ONE table — either the active pending-action rows or the
 * rejected ones. Both pull from the same hook so we don't double-fetch.
 */
export function PendingPartActions({ variant, rejectedOnly, defaultOpen = false }: Props) {
  const effective: Variant = variant ?? (rejectedOnly ? 'rejected' : 'active')
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

  const rows = (data ?? []).filter((r) => {
    // A blocked SKU supersedes every other status — those rows live
    // exclusively in the BlockedSkuTable and don't appear here.
    if (r.parts?.is_sku_blocked) return false
    if (effective === 'active')         return !ANY_REJECTED_SET.has(r.status)
    if (effective === 'rejected_final') return FINAL_REJECTED_SET.has(r.status)
    return PENDING_REJECTED_SET.has(r.status)  // 'rejected' (without _final)
  })

  const title =
    effective === 'rejected_final' ? 'מק״טים שנדחו סופית' :
    effective === 'rejected'       ? 'מק״טים שנדחו' :
                                     'פעולות פתוחות'
  const badgeId =
    effective === 'rejected_final' ? 4011 :
    effective === 'rejected'       ? 4008 :
                                     4003
  const tone =
    effective === 'rejected'       ? 'text-danger' :
    effective === 'rejected_final' ? 'text-muted' :
                                     undefined
  const isRejected = effective !== 'active'

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
          {effective === 'active'         ? 'אין כרגע חלקים שצריך לטפל בהם'
          : effective === 'rejected'      ? 'אין פריטים שנדחו'
                                          : 'אין פריטים שנדחו סופית'}
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
              highlight={isRejected}
            />
          ))}
        </ul>
      )}
    </CollapsibleSection>
  )
}
