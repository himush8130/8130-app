import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { usePendingActions, type PendingPart } from '../hooks/usePendingActions'
import { useAppSettings } from '../hooks/useAppSettings'
import { useVehiclesMap } from '../hooks/useVehicles'
import { useVehicleCallStats } from '../hooks/useVehicleCallStats'
import { Card } from './ui/Card'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { bulkUpdateRequiredPartStatus, updateRequiredPartStatus, type ReceiveDestination } from '../lib/warehouseActions'
import { ReceiveDestinationDialog } from './ReceiveDestinationDialog'
import { buildCopyText } from '../lib/copyFormat'
import type { RequiredPartStatus } from '../types/db'

type Tab = 'awaiting_order' | 'awaiting_receipt' | 'received'

const TAB_LABEL: Record<Tab, string> = {
  awaiting_order:   'ממתין להזמנה',
  awaiting_receipt: 'ממתין לקבלה',
  received:         'התקבל',
}

// Status-coloured classes for the three big square tab buttons.
// Same hue in both states; the active state just gets a thicker
// border so the press-affordance is clearly visible without
// flipping the whole colour.
const TAB_BASE: Record<Tab, string> = {
  awaiting_order:   'bg-danger/10  text-danger  border-danger  hover:bg-danger/15',
  awaiting_receipt: 'bg-warning/10 text-warning border-warning hover:bg-warning/15',
  received:         'bg-info/10    text-info    border-info    hover:bg-info/15',
}

const HOUR = 60 * 60 * 1000

/** Single combined card for the three live statuses the warehouse
 *  works through. Replaces the legacy active-variant of
 *  PendingPartActions.
 *
 *  - Tabs with live counts.
 *  - Per-row checkbox for bulk transitions.
 *  - Transitions out of "ממתין להזמנה" prompt once for an order
 *    number that applies to every selected row.
 *  - The "ממתין לקבלה" tab is sorted by how long the row has been
 *    waiting (oldest first) with colour tones: red >48h, yellow >24h.
 */
export function ActivePartActions() {
  const employee = useAuthStore((s) => s.employee)
  const { data, isLoading } = usePendingActions()
  const { data: settings } = useAppSettings()
  const vehiclesMap = useVehiclesMap()
  const { data: callStats } = useVehicleCallStats()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // The active tab is mirrored to ?actab= so navigating into a row's
  // detail page and back lands the user on the same open tab they
  // came from — instead of resetting to the collapsed default.
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('actab') as Tab | null
  const tab: Tab | null = tabParam === 'awaiting_order' || tabParam === 'awaiting_receipt' || tabParam === 'received'
    ? tabParam
    : null
  function setTab(next: Tab | null) {
    const sp = new URLSearchParams(searchParams)
    if (next) sp.set('actab', next)
    else      sp.delete('actab')
    setSearchParams(sp, { replace: true })
  }

  const [skuFilter, setSkuFilter] = useState('')
  const [orderFilter, setOrderFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pendingOrderNumber, setPendingOrderNumber] = useState<{ status: 'awaiting_receipt' | 'received' } | null>(null)
  const [orderNumberDraft, setOrderNumberDraft] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Per-item destination queue used when target = received. Each item
   *  pops up the dialog one at a time. orderNumber is set when the
   *  source tab is awaiting_order — the same number applies to all
   *  items in the batch. */
  const [receiveQueue, setReceiveQueue] = useState<
    Array<{ id: string; partId: string; name: string; sku: string; orderNumber?: string }>
  >([])
  const [receiveTotal, setReceiveTotal] = useState(0)

  async function copyName(row: PendingPart) {
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

  // Counts across the three tabs — feed the headline numbers in the
  // tab buttons. Rejected/blocked/delivered rows are excluded.
  const counts = useMemo(() => {
    const out: Record<Tab, number> = { awaiting_order: 0, awaiting_receipt: 0, received: 0 }
    for (const r of data ?? []) {
      if (r.parts?.is_sku_blocked) continue
      if (r.status === 'awaiting_order' || r.status === 'awaiting_receipt' || r.status === 'received') {
        out[r.status] += 1
      }
    }
    return out
  }, [data])

  // Filter + sort the rows shown under the active tab.
  const rows = useMemo<PendingPart[]>(() => {
    if (!tab) return []
    const skuQ = skuFilter.trim().toLowerCase()
    const orderQ = tab === 'awaiting_receipt' ? orderFilter.trim().toLowerCase() : ''
    const filtered = (data ?? []).filter((r) => {
      if (r.status !== tab) return false
      if (r.parts?.is_sku_blocked) return false
      if (skuQ && !(r.parts?.sku ?? '').toLowerCase().includes(skuQ)) return false
      if (orderQ && !((r.order_number ?? '').toLowerCase().includes(orderQ))) return false
      return true
    })

    if (tab === 'awaiting_receipt') {
      // Oldest first → most urgent at the top.
      return filtered.sort((a, b) => {
        const ta = a.awaiting_receipt_since ?? a.requested_at
        const tb = b.awaiting_receipt_since ?? b.requested_at
        return ta.localeCompare(tb)
      })
    }
    return filtered.sort((a, b) => a.requested_at.localeCompare(b.requested_at))
  }, [data, tab, skuFilter, orderFilter])

  // Toggle behaviour: click open tab → close. Click other tab → switch.
  function clickTab(next: Tab) {
    setSelectedIds(new Set())
    setOrderFilter('')
    setError(null)
    setPendingOrderNumber(null)
    setTab(tab === next ? null : next)
  }

  function toggle(id: string) {
    setSelectedIds((s) => {
      const out = new Set(s)
      if (out.has(id)) out.delete(id)
      else out.add(id)
      return out
    })
  }

  function selectAllVisible() {
    setSelectedIds(new Set(rows.map((r) => r.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function applyStatus(target: RequiredPartStatus, orderNumber?: string) {
    if (!employee) return
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setBusy(true); setError(null)
    const res = await bulkUpdateRequiredPartStatus(employee.employee_number, ids, target, orderNumber ?? undefined)
    setBusy(false)
    if (res.ok === false && res.failed_count) {
      setError(`חלק מהפריטים נכשלו (${res.failed_count})`)
    } else if (res.ok === false) {
      setError(res.error || 'שגיאה')
    }
    queryClient.invalidateQueries({ queryKey: ['pending_parts_actions'] })
    setSelectedIds(new Set())
    setPendingOrderNumber(null)
    setOrderNumberDraft('')
  }

  function buildQueue(orderNumber?: string) {
    const items = rows
      .filter((r) => selectedIds.has(r.id))
      .map((r) => ({
        id:      r.id,
        partId:  r.part_id,
        name:    r.parts?.name ?? '?',
        sku:     r.parts?.sku ?? '',
        ...(orderNumber ? { orderNumber } : {}),
      }))
    setReceiveQueue(items)
    setReceiveTotal(items.length)
  }

  function startTransition(target: 'awaiting_receipt' | 'received') {
    if (selectedIds.size === 0) return
    if (target === 'received') {
      // Each item needs its own destination — queue them up.
      if (tab === 'awaiting_order') {
        // Order number first, then start the destination queue.
        setPendingOrderNumber({ status: 'received' })
        setOrderNumberDraft('')
        return
      }
      buildQueue()
      return
    }
    // awaiting_receipt: bulk in one call, no destination needed.
    if (tab === 'awaiting_order') {
      setPendingOrderNumber({ status: 'awaiting_receipt' })
      setOrderNumberDraft('')
      return
    }
    void applyStatus(target)
  }

  function confirmOrderNumber() {
    if (!pendingOrderNumber) return
    const num = orderNumberDraft.trim()
    if (!num) { setError('מספר דרישה חובה'); return }
    if (pendingOrderNumber.status === 'received') {
      // Continue to the destination queue, applying the same order
      // number to every item.
      setPendingOrderNumber(null)
      setOrderNumberDraft('')
      buildQueue(num)
      return
    }
    void applyStatus(pendingOrderNumber.status, num)
  }

  async function confirmReceive(dest: ReceiveDestination) {
    if (!employee || receiveQueue.length === 0) return
    const [current, ...rest] = receiveQueue
    setBusy(true); setError(null)
    const res: any = await updateRequiredPartStatus(
      employee.employee_number,
      current.id,
      'received',
      null,
      dest,
      current.orderNumber,
    )
    setBusy(false)
    if (!res.ok) {
      setError(`שגיאה בעדכון פריט ${current.sku}: ${res.error ?? ''}`)
      // Bail out of the rest of the queue so the user can investigate.
      setReceiveQueue([])
      setReceiveTotal(0)
      queryClient.invalidateQueries({ queryKey: ['pending_parts_actions'] })
      return
    }
    if (rest.length === 0) {
      setReceiveQueue([])
      setReceiveTotal(0)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['pending_parts_actions'] })
    } else {
      setReceiveQueue(rest)
    }
  }

  function cancelReceiveQueue() {
    setReceiveQueue([])
    setReceiveTotal(0)
  }

  // What bulk actions are available from each tab? Only forward-moving
  // transitions are surfaced — backwards moves stay in the per-row
  // detail page.
  const bulkButtons: Array<{ to: 'awaiting_receipt' | 'received'; label: string }> = (() => {
    if (tab === 'awaiting_order') {
      return [
        { to: 'awaiting_receipt', label: 'סמן כממתין לקבלה' },
        { to: 'received',         label: 'סמן כהתקבל' },
      ]
    }
    if (tab === 'awaiting_receipt') {
      return [{ to: 'received', label: 'סמן כהתקבל' }]
    }
    return []  // received: dispense per-row via the detail page
  })()

  return (
    <Card>
      <ComponentBadge id={4003} />

      {/* Tabs ARE the header. Three equal-sized squares in a single
          row, each coloured by the status it represents. Clicking
          the active tab collapses the panel back to the default. */}
      <div className="px-3 py-3 grid grid-cols-3 gap-2">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
          const active = tab === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => clickTab(t)}
              aria-expanded={active}
              className={`aspect-square rounded-md transition-colors flex flex-col items-center justify-center gap-1 px-2 text-center ${
                TAB_BASE[t]
              } ${active ? 'border-[3px] font-semibold' : 'border'}`}
            >
              <span className="text-sm leading-tight">{TAB_LABEL[t]}</span>
              <span className="text-2xl font-bold leading-none">{counts[t]}</span>
            </button>
          )
        })}
      </div>

      {/* Body — only renders when a tab is open. */}
      {tab && (
        <>
          <div className="px-3 pt-1 pb-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              label="סינון לפי מק״ט"
              name="active-sku-filter"
              value={skuFilter}
              onChange={(e) => setSkuFilter(e.target.value)}
              placeholder="034910308"
            />
            {tab === 'awaiting_receipt' && (
              <Input
                label="סינון לפי מספר דרישה"
                name="active-order-filter"
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
                placeholder="PO-2026-0042"
              />
            )}
          </div>

          {bulkButtons.length > 0 && (
            <div className="px-3 py-2 border-t border-border bg-muted-surface/40 flex items-center gap-2 flex-wrap text-xs">
              <button
                type="button"
                onClick={selectAllVisible}
                className="text-primary hover:underline"
              >
                סמן הכל ({rows.length})
              </button>
              {selectedIds.size > 0 && (
                <>
                  <button type="button" onClick={clearSelection} className="text-muted hover:underline">
                    נקה ({selectedIds.size})
                  </button>
                  <span className="text-muted">·</span>
                  {bulkButtons.map((b) => (
                    <Button
                      key={b.to}
                      onClick={() => startTransition(b.to)}
                      className="text-xs px-3 py-1"
                      disabled={busy}
                    >
                      {b.label}
                    </Button>
                  ))}
                </>
              )}
              {error && <span className="text-danger">{error}</span>}
            </div>
          )}

          {pendingOrderNumber && (
            <div className="px-3 py-3 border-t border-border bg-warning/5 flex flex-col gap-2">
              <p className="text-sm text-foreground">
                הזן מספר דרישה לכל {selectedIds.size} הפריטים שנבחרו
                ({TAB_LABEL[pendingOrderNumber.status]})
              </p>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    label="מספר דרישה"
                    name="bulk-order-number"
                    value={orderNumberDraft}
                    onChange={(e) => setOrderNumberDraft(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button onClick={confirmOrderNumber} disabled={busy || !orderNumberDraft.trim()} className="text-xs px-3 py-2">
                  {busy ? 'מעדכן...' : 'אישור'}
                </Button>
                <Button variant="ghost" onClick={() => setPendingOrderNumber(null)} className="text-xs px-3 py-2">
                  ביטול
                </Button>
              </div>
            </div>
          )}

          {isLoading && <p className="text-sm text-muted text-center py-4">טוען...</p>}
          {!isLoading && rows.length === 0 && (
            <p className="text-sm text-muted text-center py-4">
              {skuFilter.trim() ? 'לא נמצא מק״ט תואם' : 'אין פריטים בסטטוס הזה'}
            </p>
          )}
          {rows.length > 0 && (
            <ul className="border-t border-border">
              {rows.map((row) => (
                <ActiveRow
                  key={row.id}
                  row={row}
                  tab={tab}
                  selected={selectedIds.has(row.id)}
                  copied={copiedId === row.id}
                  onToggle={() => toggle(row.id)}
                  onCopyName={() => copyName(row)}
                  onOpen={() => navigate(`/warehouse/required-part/${row.id}`)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {receiveQueue.length > 0 && (
        <ReceiveDestinationDialog
          partId={receiveQueue[0].partId}
          busy={busy}
          progress={`${receiveTotal - receiveQueue.length + 1} מתוך ${receiveTotal}`}
          subtitle={`${receiveQueue[0].name} · ${receiveQueue[0].sku}`}
          onClose={cancelReceiveQueue}
          onConfirm={confirmReceive}
        />
      )}
    </Card>
  )
}

function ActiveRow({
  row, tab, selected, copied, onToggle, onCopyName, onOpen,
}: {
  row: PendingPart
  tab: Tab
  selected: boolean
  copied: boolean
  onToggle: () => void
  onCopyName: () => void
  onOpen: () => void
}) {
  // Highlight overdue rows in the "ממתין לקבלה" tab — tint only,
  // no text label.
  let urgencyTone: string = ''
  if (tab === 'awaiting_receipt') {
    const since = row.awaiting_receipt_since ?? row.requested_at
    const ageHours = (Date.now() - new Date(since).getTime()) / HOUR
    if (ageHours >= 48)      urgencyTone = 'bg-danger/5 border-danger/30'
    else if (ageHours >= 24) urgencyTone = 'bg-warning/5 border-warning/30'
  }

  return (
    <li className={`flex items-start gap-3 px-3 py-3 border-b border-border last:border-0 ${urgencyTone}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="mt-1 w-4 h-4 accent-primary"
        aria-label="בחר פריט"
      />
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() }
        }}
        className="flex-1 min-w-0 text-start cursor-pointer"
      >
        <div className="flex items-baseline gap-2 flex-wrap">
          {/* Click-to-copy the WhatsApp payload — same behaviour as the
              legacy pending-actions list. Stops propagation so it
              doesn't also navigate. */}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCopyName() }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onCopyName() }
            }}
            title="לחץ להעתקת הפורמט"
            className="text-sm font-medium text-foreground truncate cursor-pointer hover:underline"
          >
            {row.parts?.name ?? '?'}{copied && <span className="text-success ms-1 text-xs">✓ הועתק</span>}
          </span>
          <span className="font-mono text-xs text-muted">{row.parts?.sku ?? ''}</span>
          <span className="text-xs text-muted">× {row.quantity}</span>
        </div>
        <div className="flex gap-2 flex-wrap mt-1 text-[11px] text-muted">
          {row.service_calls?.display_id && (
            <span className="font-mono">קריאה {row.service_calls.display_id}</span>
          )}
          {row.warehouse_orders?.display_id && (
            <span className="font-mono">הזמנת מחסן {row.warehouse_orders.display_id}</span>
          )}
          {(row as any).order_number && (
            <span className="font-mono">מס׳ דרישה: {(row as any).order_number}</span>
          )}
        </div>
      </div>
    </li>
  )
}
