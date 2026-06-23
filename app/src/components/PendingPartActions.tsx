import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAppSettings } from '../hooks/useAppSettings'
import { useVehiclesMap } from '../hooks/useVehicles'
import { useVehicleCallStats } from '../hooks/useVehicleCallStats'
import { usePendingActions } from '../hooks/usePendingActions'
import { useAuthStore } from '../store/auth'
import { Card, CardBody } from './ui/Card'
import { CollapsibleSection } from './CollapsibleSection'
import { PendingActionRow, type RowData } from './PendingActionRow'
import { ReceiveDestinationDialog } from './ReceiveDestinationDialog'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { buildCopyText } from '../lib/copyFormat'
import { updatePart, updateRequiredPartStatus, type ReceiveDestination } from '../lib/warehouseActions'
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

type Variant = 'active' | 'rejected' | 'rejected_final' | 'blocked' | 'delivered' | 'not_consumed' | 'wear_credited'

interface Props {
  variant?:      Variant
  defaultOpen?:  boolean
  rejectedOnly?: boolean
  headless?:     boolean
}

export function PendingPartActions({ variant, rejectedOnly, defaultOpen = false, headless }: Props) {
  const effective: Variant = variant ?? (rejectedOnly ? 'rejected' : 'active')
  const { data, isLoading } = usePendingActions()
  const { data: settings } = useAppSettings()
  const vehiclesMap = useVehiclesMap()
  const { data: callStats } = useVehicleCallStats()
  const [skuFilter, setSkuFilter] = useState('')
  const employee = useAuthStore((s) => s.employee)
  const queryClient = useQueryClient()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  /** Row currently waiting on the warehouse-picker dialog. */
  const [returnRow, setReturnRow] = useState<RowData | null>(null)

  // "הסתר מטבלה זו" — flips the parts.hide_from_blocked_table flag
  // on the catalog row, so the hide takes effect for every warehouse
  // user (not just the one who clicked).
  async function hideBlockedPart(partId: string) {
    if (!employee) return
    await updatePart(employee.employee_number, partId, { hide_from_blocked_table: true })
    queryClient.invalidateQueries({ queryKey: ['pending_parts_actions'] })
    queryClient.invalidateQueries({ queryKey: ['parts'] })
  }

  async function confirmReturnDestination(dest: ReceiveDestination) {
    if (!employee || !returnRow) return
    const row = returnRow
    setBusyId(row.id)
    const res = await updateRequiredPartStatus(
      employee.employee_number,
      row.id,
      'in_stock',
      null,
      dest,
    )
    setBusyId(null)
    setReturnRow(null)
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ['pending_parts_actions'] })
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      const name = row.parts?.name ?? 'הפריט'
      const sku  = row.parts?.sku  ?? ''
      setToast(`✓ ${row.quantity} יחידות הוחזרו למלאי · ${name}${sku ? ` · ${sku}` : ''}`)
      setTimeout(() => setToast(null), 2200)
    } else {
      setToast('שגיאה בהחזרה למלאי')
      setTimeout(() => setToast(null), 2200)
    }
  }

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
    if (effective === 'blocked') {
      if (!blocked) return false
      if (r.parts?.hide_from_blocked_table) return false
      return true
    }
    if (blocked) return false
    if (effective === 'delivered')       return r.status === 'delivered'
    if (effective === 'not_consumed')   return r.status === 'not_consumed'
    if (effective === 'wear_credited')  return r.status === 'wear_credited'
    if (effective === 'active') {
      if (ANY_REJECTED_SET.has(r.status) || r.status === 'delivered' || r.status === 'not_consumed' || r.status === 'wear' || r.status === 'wear_credited') return false
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
    if (effective === 'blocked') {
      // Rows with a replacement_sku assigned sink to the bottom — the
      // urgent ones (still without a replacement) stay on top.
      const aHas = !!(a.parts?.replacement_sku && a.parts.replacement_sku.trim()) ? 1 : 0
      const bHas = !!(b.parts?.replacement_sku && b.parts.replacement_sku.trim()) ? 1 : 0
      if (aHas !== bHas) return aHas - bHas
    }
    return 0
  })

  const title =
    effective === 'rejected_final' ? 'מק״טים שנדחו סופית' :
    effective === 'rejected'       ? 'מק״טים שנדחו' :
    effective === 'blocked'        ? 'מק״טים חסומים' :
    effective === 'delivered'      ? 'פריטים שנופקו' :
    effective === 'not_consumed'   ? 'פריטים שלא נצרכו' :
    effective === 'wear_credited'  ? 'בלאי מזוכה' :
                                     'פעולות פתוחות'
  const badgeId =
    effective === 'rejected_final' ? 4011 :
    effective === 'rejected'       ? 4008 :
    effective === 'blocked'        ? 4010 :
    effective === 'delivered'      ? 4012 :
    effective === 'not_consumed'   ? 4016 :
    effective === 'wear_credited'  ? 4017 :
                                     4003
  const tone =
    effective === 'rejected'       ? 'text-danger' :
    effective === 'rejected_final' ? 'text-muted'  :
    effective === 'blocked'        ? 'text-warning' :
    effective === 'delivered'      ? 'text-success' :
    effective === 'not_consumed'   ? 'text-warning' :
    effective === 'wear_credited'  ? 'text-muted'  :
                                     undefined
  // Whether to paint a row red. For blocked: only rows still WITHOUT a
  // replacement_sku — once a warehouse user assigns a replacement, the
  // row turns neutral (and can be hidden via the per-row button).
  function rowHighlight(row: typeof rows[number]): boolean {
    if (effective === 'rejected' || effective === 'rejected_final') return true
    if (effective === 'blocked') {
      return !(row.parts?.replacement_sku && row.parts.replacement_sku.trim())
    }
    return false
  }

  const headerCount =
    effective === 'blocked'
      ? rows.filter((r) => !(r.parts?.replacement_sku && r.parts.replacement_sku.trim())).length
      : rows.length

  const body = (
    <>
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
          : effective === 'not_consumed'  ? 'אין פריטים בסטטוס "לא נצרך"'
          : effective === 'wear_credited' ? 'אין פריטים בסטטוס "בלאי מזוכה"'
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
                    highlight={rowHighlight(row)}
                    showWithdrawal={effective === 'delivered'}
                    copyFormatText={() => copyFormatText(row)}
                    trailingAction={
                      effective === 'not_consumed' ? (
                        <Button
                          variant="secondary"
                          onClick={(e) => { e.stopPropagation(); setReturnRow(row) }}
                          disabled={busyId === row.id}
                          className="text-xs px-3 py-1"
                        >
                          {busyId === row.id ? '...' : 'החזר למלאי'}
                        </Button>
                      ) : effective === 'blocked' && row.parts?.replacement_sku && row.parts.replacement_sku.trim() ? (
                        <Button
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); hideBlockedPart(row.part_id) }}
                          className="text-xs px-3 py-1"
                          title="הסתר מטבלה זו (לכל המשתמשים)"
                        >
                          הסתר מטבלה זו
                        </Button>
                      ) : null
                    }
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
                      highlight={rowHighlight(row)}
                      showWithdrawal={effective === 'delivered'}
                      copyFormatText={() => copyFormatText(row)}
                      trailingAction={
                        effective === 'not_consumed' ? (
                          <Button
                            variant="secondary"
                            onClick={(e) => { e.stopPropagation(); setReturnRow(row) }}
                            disabled={busyId === row.id}
                            className="text-xs px-3 py-1"
                          >
                            {busyId === row.id ? '...' : 'החזר למלאי'}
                          </Button>
                        ) : effective === 'blocked' && row.parts?.replacement_sku && row.parts.replacement_sku.trim() ? (
                          <Button
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); hideBlockedPart(row.part_id) }}
                            className="text-xs px-3 py-1"
                            title="הסתר מטבלה זו (לכל המשתמשים)"
                          >
                            הסתר מטבלה זו
                          </Button>
                        ) : null
                      }
                    />
                  ))}
                </ul>
              </div>
            ))}
          </>
        )
      })()}
      {/* Warehouse-destination picker for "החזר למלאי" — reuses the
          same dialog that the receive flow uses. The chosen
          destination is forwarded to the server as a `receive`
          parameter and applied identically. */}
      {returnRow && (
        <ReceiveDestinationDialog
          partId={returnRow.part_id}
          orderedQuantity={returnRow.quantity}
          busy={busyId === returnRow.id}
          subtitle={`${returnRow.parts?.name ?? ''} · ${returnRow.parts?.sku ?? ''}`}
          onClose={() => setReturnRow(null)}
          onConfirm={confirmReturnDestination}
        />
      )}

      {/* Floating confirmation after "החזר למלאי" — sits above
          everything via portal, 2.2s, doesn't push the table. */}
      {toast && typeof document !== 'undefined' && createPortal(
        <div
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div className="bg-foreground text-card px-4 py-2 rounded-md shadow-xl text-sm font-medium max-w-md text-center">
            {toast}
          </div>
        </div>,
        document.body,
      )}
    </>
  )

  if (headless) {
    return <Card><CardBody className="p-0">{body}</CardBody></Card>
  }

  return (
    <CollapsibleSection
      title={title}
      count={headerCount}
      defaultOpen={defaultOpen}
      badgeId={badgeId}
      countTone={tone}
    >
      {body}
    </CollapsibleSection>
  )
}
