import { useState } from 'react'
import { useAppSettings } from '../hooks/useAppSettings'
import { useVehiclesMap } from '../hooks/useVehicles'
import { useVehicleCallStats } from '../hooks/useVehicleCallStats'
import { usePendingActions } from '../hooks/usePendingActions'
import { CollapsibleSection } from './CollapsibleSection'
import { PendingActionRow, type RowData } from './PendingActionRow'
import { Input } from './ui/Input'
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
  const [skuFilter, setSkuFilter] = useState('')

  function copyFormatText(row: RowData): string | null {
    if (!settings || !row.parts) return null
    const sc = row.service_calls as { vehicle_number?: string | null } | null | undefined
    const vehicleNumber = sc?.vehicle_number ?? null
    const vehicle = vehicleNumber ? vehiclesMap.get(vehicleNumber) ?? null : null
    const stats   = vehicleNumber ? callStats?.get(vehicleNumber) : undefined
    return buildCopyText({
      settings,
      vehicle,
      vehicleDisabled: !!stats?.disabled,
      row,
      partName: row.parts.name,
      partSku:  row.parts.sku,
    })
  }

  const skuQuery = effective === 'active' ? skuFilter.trim().toLowerCase() : ''

  const rows = (data ?? []).filter((r) => {
    const blocked = !!r.parts?.is_sku_blocked
    if (effective === 'blocked')        return blocked
    if (blocked) return false
    if (effective === 'delivered')      return r.status === 'delivered'
    if (effective === 'active') {
      if (ANY_REJECTED_SET.has(r.status) || r.status === 'delivered') return false
      if (skuQuery && !(r.parts?.sku.toLowerCase().includes(skuQuery))) return false
      return true
    }
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
      {effective === 'active' && (
        <div className="px-4 py-2 border-b border-border">
          <Input
            label="סינון לפי מק״ט"
            name="pending-sku-filter"
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
            placeholder="034910308"
          />
        </div>
      )}
      {isLoading && <p className="text-sm text-muted text-center py-4">טוען...</p>}
      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-muted text-center py-4">
          {effective === 'active'         ? (skuQuery ? 'לא נמצא מק״ט תואם' : 'אין כרגע חלקים שצריך לטפל בהם')
          : effective === 'rejected'      ? 'אין פריטים שנדחו'
          : effective === 'rejected_final'? 'אין פריטים שנדחו סופית'
          : effective === 'delivered'     ? 'אין פריטים שנופקו'
                                          : 'אין מק״טים חסומים'}
        </p>
      )}
      {rows.length > 0 && (() => {
        // Group rows whose parent is a standalone warehouse order under
        // a per-order header. Call-linked rows render flat at the top.
        const callRows: typeof rows = []
        const byOrder = new Map<string, { display_id: string; rows: typeof rows }>()
        for (const r of rows) {
          if (r.warehouse_order_id && r.warehouse_orders?.display_id) {
            const entry = byOrder.get(r.warehouse_order_id) ?? {
              display_id: r.warehouse_orders.display_id,
              rows: [] as typeof rows,
            }
            entry.rows.push(r)
            byOrder.set(r.warehouse_order_id, entry)
          } else {
            callRows.push(r)
          }
        }
        const orderEntries = [...byOrder.values()].sort((a, b) => a.display_id.localeCompare(b.display_id))
        return (
          <>
            {callRows.length > 0 && (
              <ul>
                {callRows.map((row) => (
                  <PendingActionRow
                    key={row.id}
                    row={row}
                    highlight={highlightRows}
                    showWithdrawal={effective === 'delivered'}
                    copyFormatText={() => copyFormatText(row)}
                  />
                ))}
              </ul>
            )}
            {orderEntries.map((entry) => (
              <div key={entry.display_id}>
                <div className="px-4 py-2 bg-muted-surface border-y border-border text-xs font-semibold text-foreground">
                  הזמנת מחסן כללית <span className="font-mono text-muted">{entry.display_id}</span>
                </div>
                <ul>
                  {entry.rows.map((row) => (
                    <PendingActionRow
                      key={row.id}
                      row={row}
                      highlight={highlightRows}
                      showWithdrawal={effective === 'delivered'}
                      copyFormatText={() => copyFormatText(row)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </>
        )
      })()}
    </CollapsibleSection>
  )
}
