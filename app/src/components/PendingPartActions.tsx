import { useState } from 'react'
import { useAppSettings } from '../hooks/useAppSettings'
import { useVehiclesMap } from '../hooks/useVehicles'
import { useVehicleCallStats } from '../hooks/useVehicleCallStats'
import { usePendingActions } from '../hooks/usePendingActions'
import { CollapsibleSection } from './CollapsibleSection'
import { PendingActionRow, type RowData } from './PendingActionRow'
import { buildCopyText } from '../lib/copyFormat'
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

type Variant = 'active' | 'rejected' | 'rejected_final' | 'blocked' | 'delivered'

interface Props {
  variant?:      Variant
  defaultOpen?:  boolean
  rejectedOnly?: boolean
}

export function PendingPartActions({ variant, rejectedOnly, defaultOpen = false }: Props) {
  const effective: Variant = variant ?? (rejectedOnly ? 'rejected' : 'active')
  const { data, isLoading } = usePendingActions()
  const { data: settings } = useAppSettings()
  const vehiclesMap = useVehiclesMap()
  const { data: callStats } = useVehicleCallStats()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function copyName(row: RowData) {
    if (!settings || !row.parts) return
    const sc = row.service_calls as { vehicle_number?: string | null } | null | undefined
    const vehicleNumber = sc?.vehicle_number ?? null
    const vehicle = vehicleNumber ? vehiclesMap.get(vehicleNumber) ?? null : null
    const stats   = vehicleNumber ? callStats?.get(vehicleNumber) : undefined
    const text = buildCopyText({
      settings,
      vehicle,
      vehicleDisabled: !!stats?.disabled,
      row,
      partName: row.parts.name,
      partSku:  row.parts.sku,
    })
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(row.id)
      setTimeout(() => setCopiedId((v) => (v === row.id ? null : v)), 1500)
    } catch { /* clipboard may be denied */ }
  }

  const rows = (data ?? []).filter((r) => {
    const blocked = !!r.parts?.is_sku_blocked
    if (effective === 'blocked')        return blocked
    if (blocked) return false
    if (effective === 'delivered')      return r.status === 'delivered'
    if (effective === 'active')         return !ANY_REJECTED_SET.has(r.status) && r.status !== 'delivered'
    if (effective === 'rejected_final') return FINAL_REJECTED_SET.has(r.status)
    return PENDING_REJECTED_SET.has(r.status)
  }).sort((a, b) => {
    if (effective === 'delivered') {
      // Newest dispense first; fall back to requested_at.
      const aw = a.part_withdrawals?.[0]?.withdrawn_at ?? a.requested_at ?? ''
      const bw = b.part_withdrawals?.[0]?.withdrawn_at ?? b.requested_at ?? ''
      return bw.localeCompare(aw)
    }
    return 0
  })

  const title =
    effective === 'rejected_final' ? 'מק״טים שנדחו סופית' :
    effective === 'rejected'       ? 'מק״טים שנדחו' :
    effective === 'blocked'        ? 'מק״טים חסומים' :
    effective === 'delivered'      ? 'פריטים שנופקו' :
                                     'פעולות פתוחות'
  const badgeId =
    effective === 'rejected_final' ? 4011 :
    effective === 'rejected'       ? 4008 :
    effective === 'blocked'        ? 4010 :
    effective === 'delivered'      ? 4012 :
                                     4003
  const tone =
    effective === 'rejected'       ? 'text-danger' :
    effective === 'rejected_final' ? 'text-muted'  :
    effective === 'blocked'        ? 'text-warning' :
    effective === 'delivered'      ? 'text-success' :
                                     undefined
  const highlightRows = effective === 'rejected' || effective === 'rejected_final' || effective === 'blocked'

  return (
    <CollapsibleSection
      title={title}
      count={rows.length}
      defaultOpen={defaultOpen}
      badgeId={badgeId}
      countTone={tone}
    >
      {isLoading && <p className="text-sm text-muted text-center py-4">טוען...</p>}
      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-muted text-center py-4">
          {effective === 'active'         ? 'אין כרגע חלקים שצריך לטפל בהם'
          : effective === 'rejected'      ? 'אין פריטים שנדחו'
          : effective === 'rejected_final'? 'אין פריטים שנדחו סופית'
          : effective === 'delivered'     ? 'אין פריטים שנופקו'
                                          : 'אין מק״טים חסומים'}
        </p>
      )}
      {rows.length > 0 && (
        <ul>
          {rows.map((row) => (
            <PendingActionRow
              key={row.id}
              row={row}
              highlight={highlightRows}
              showWithdrawal={effective === 'delivered'}
              onCopyName={copyName}
              copied={copiedId === row.id}
            />
          ))}
        </ul>
      )}
    </CollapsibleSection>
  )
}
