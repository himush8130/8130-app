import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { usePendingActions, type PendingPart } from '../hooks/usePendingActions'
import { CollapsibleSection } from './CollapsibleSection'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { bulkUpdateRequiredPartStatus } from '../lib/warehouseActions'
import type { RequiredPartStatus } from '../types/db'

type Tab = 'awaiting_order' | 'awaiting_receipt' | 'received'

const TAB_LABEL: Record<Tab, string> = {
  awaiting_order:   'ממתין להזמנה',
  awaiting_receipt: 'ממתין לקבלה',
  received:         'התקבל',
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
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('awaiting_order')
  const [skuFilter, setSkuFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pendingOrderNumber, setPendingOrderNumber] = useState<{ status: 'awaiting_receipt' | 'received' } | null>(null)
  const [orderNumberDraft, setOrderNumberDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    const skuQ = skuFilter.trim().toLowerCase()
    const filtered = (data ?? []).filter((r) => {
      if (r.status !== tab) return false
      if (r.parts?.is_sku_blocked) return false
      if (skuQ && !(r.parts?.sku ?? '').toLowerCase().includes(skuQ)) return false
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
  }, [data, tab, skuFilter])

  // Clear selection when tab or filter changes — different rows are visible.
  function switchTab(next: Tab) {
    setTab(next)
    setSelectedIds(new Set())
    setError(null)
    setPendingOrderNumber(null)
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

  function startTransition(target: 'awaiting_receipt' | 'received') {
    if (selectedIds.size === 0) return
    if (tab === 'awaiting_order') {
      // Order number is required for this direction.
      setPendingOrderNumber({ status: target })
      setOrderNumberDraft('')
      return
    }
    void applyStatus(target)
  }

  async function confirmOrderNumber() {
    if (!pendingOrderNumber) return
    const num = orderNumberDraft.trim()
    if (!num) { setError('מספר דרישה חובה'); return }
    await applyStatus(pendingOrderNumber.status, num)
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

  const allCount = counts.awaiting_order + counts.awaiting_receipt + counts.received

  return (
    <CollapsibleSection
      title="פעולות פתוחות"
      count={allCount}
      defaultOpen
      badgeId={4003}
    >
      {/* Tab bar */}
      <div className="px-3 pt-3 flex gap-2 flex-wrap">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
          const active = tab === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 ${
                active
                  ? 'bg-primary text-primary-fg border-primary'
                  : 'bg-card text-foreground border-border hover:bg-muted-surface'
              }`}
            >
              <span>{TAB_LABEL[t]}</span>
              <span className={`text-[11px] font-mono ${active ? 'opacity-90' : 'text-muted'}`}>
                ({counts[t]})
              </span>
            </button>
          )
        })}
      </div>

      {/* SKU filter */}
      <div className="px-3 pt-2 pb-1">
        <Input
          label="סינון לפי מק״ט"
          name="active-sku-filter"
          value={skuFilter}
          onChange={(e) => setSkuFilter(e.target.value)}
          placeholder="034910308"
        />
      </div>

      {/* Bulk action toolbar — only appears when at least one row is selected */}
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

      {/* Order-number prompt */}
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

      {/* List */}
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
              onToggle={() => toggle(row.id)}
              onOpen={() => navigate(`/warehouse/required-part/${row.id}`)}
            />
          ))}
        </ul>
      )}
    </CollapsibleSection>
  )
}

function ActiveRow({
  row, tab, selected, onToggle, onOpen,
}: {
  row: PendingPart
  tab: Tab
  selected: boolean
  onToggle: () => void
  onOpen: () => void
}) {
  // Highlight overdue rows in the "ממתין לקבלה" tab.
  let urgencyTone: string = ''
  let urgencyLabel: string | null = null
  if (tab === 'awaiting_receipt') {
    const since = row.awaiting_receipt_since ?? row.requested_at
    const ageHours = (Date.now() - new Date(since).getTime()) / HOUR
    if (ageHours >= 48) {
      urgencyTone = 'bg-danger/5 border-danger/30'
      urgencyLabel = `מעל ${Math.floor(ageHours)}ש'`
    } else if (ageHours >= 24) {
      urgencyTone = 'bg-warning/5 border-warning/30'
      urgencyLabel = `מעל ${Math.floor(ageHours)}ש'`
    }
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
      <button
        type="button"
        onClick={onOpen}
        className="flex-1 min-w-0 text-start"
      >
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">
            {row.parts?.name ?? '?'}
          </span>
          <span className="font-mono text-xs text-muted">{row.parts?.sku ?? ''}</span>
          <span className="text-xs text-muted">× {row.quantity}</span>
          {urgencyLabel && (
            <span className={`text-[11px] font-semibold ${urgencyTone.includes('danger') ? 'text-danger' : 'text-warning'}`}>
              {urgencyLabel}
            </span>
          )}
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
      </button>
    </li>
  )
}
