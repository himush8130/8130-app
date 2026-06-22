import { useState, useMemo, useCallback, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '../components/AppHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { PartsCatalogList } from '../components/PartsCatalogList'
import { usePendingActions, type PendingPart } from '../hooks/usePendingActions'
import { useParts } from '../hooks/useParts'
import { useAppSettings } from '../hooks/useAppSettings'
import { useAuthStore } from '../store/auth'
import { setAppSetting } from '../lib/adminActions'
import type { Part } from '../types/parts'

const HIDDEN_TOP_PARTS_KEY = 'hidden_top_parts'

const NAVY = '#232150'
const HOUR = 3_600_000

type Section =
  | 'rejected' | 'blocked' | 'pending_special' | 'low_stock' | 'overdue_receipt'
  | 'awaiting_order' | 'awaiting_receipt' | 'received' | 'wear'
  | 'not_consumed' | 'delivered' | 'rejected_final' | 'wear_credited'
  | 'catalog'

interface IconProps { size?: number; color?: string }

function IconBox({ size = 24, color = '#64748b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  )
}

function IconTruck({ size = 24, color = '#64748b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 13.52 8H14" />
      <circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" />
    </svg>
  )
}

function IconClipboard({ size = 24, color = '#64748b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  )
}

function IconWarning({ size = 24, color = '#f59e0b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
            fill="#fef3c7" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1.1" fill={color} />
    </svg>
  )
}

function IconCheck({ size = 24, color = '#16a34a' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function IconBan({ size = 24, color = '#dc2626' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" />
    </svg>
  )
}

function IconArrowLeft({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function IconList({ size = 24, color = '#64748b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  )
}

function IconEyeOff({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Data helpers                                                       */
/* ------------------------------------------------------------------ */

interface TopPart { sku: string; name: string; total: number }

function topDeliveredParts(delivered: Array<{ quantity: number; parts?: { sku: string; name: string } | null }>): TopPart[] {
  const map = new Map<string, { name: string; total: number }>()
  for (const r of delivered) {
    if (!r.parts) continue
    const key = r.parts.sku
    const prev = map.get(key)
    if (prev) prev.total += r.quantity
    else map.set(key, { name: r.parts.name, total: r.quantity })
  }
  return [...map.entries()]
    .map(([sku, v]) => ({ sku, name: v.name, total: v.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
}

function formatDate(s: string): string {
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

/* ------------------------------------------------------------------ */
/*  Reusable inline list for pending-part rows                         */
/* ------------------------------------------------------------------ */

function PendingList({ rows }: { rows: PendingPart[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted text-center py-4">אין פריטים</p>
  return (
    <ul className="divide-y divide-border">
      {rows.map(r => (
        <li key={r.id}>
          <Link
            to={`/warehouse/required-part/${r.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted-surface transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{r.parts?.name ?? '?'}</div>
              <div className="text-xs text-muted font-mono">{r.parts?.sku ?? ''} · ×{r.quantity}</div>
            </div>
            <span className="text-xs text-muted font-mono shrink-0">{formatDate(r.requested_at)}</span>
            <IconArrowLeft size={14} />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function LowStockList({ rows }: { rows: Part[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted text-center py-4">אין פריטים</p>
  return (
    <table className="w-full text-xs">
      <thead className="bg-muted-surface text-muted">
        <tr>
          <th className="text-start px-3 py-2">מק״ט</th>
          <th className="text-start px-3 py-2">שם</th>
          <th className="text-start px-3 py-2">מלאי</th>
          <th className="text-start px-3 py-2">סף</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(p => (
          <tr key={p.id} className="border-t border-border">
            <td className="px-3 py-2 font-mono text-foreground">{p.sku}</td>
            <td className="px-3 py-2 text-foreground">{p.name}</td>
            <td className="px-3 py-2 text-danger font-medium">{p.quantity}</td>
            <td className="px-3 py-2 text-muted">{p.min_threshold}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ExpandedPanel({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardBody className="p-0">{children}</CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Top Stats Bar                                                      */
/* ------------------------------------------------------------------ */

const BANNER_KEYS: { key: Section; icon: ReactNode; label: string }[] = [
  { key: 'rejected',        icon: <IconWarning size={18} />,                   label: 'מק״טים שנדחו' },
  { key: 'blocked',         icon: <IconBan size={18} color="#dc2626" />,       label: 'מק״טים חסומים' },
  { key: 'pending_special', icon: <IconClipboard size={18} color="#f59e0b" />, label: 'ממתין לאישור מיוחד' },
  { key: 'low_stock',       icon: <IconBox size={18} color="#f59e0b" />,       label: 'מלאי נמוך' },
  { key: 'overdue_receipt',  icon: <IconTruck size={18} color="#dc2626" />,     label: 'ממתינים זמן רב' },
]

function TopStatsBar({ counts, active, onToggle }: {
  counts: Record<string, number>
  active: Section | null
  onToggle: (s: Section) => void
}) {
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-5 sm:py-6 text-center" style={{ backgroundColor: NAVY }}>
        <div className="flex items-center justify-center gap-3">
          <IconBox size={28} color="#fff" />
          <span className="text-3xl sm:text-5xl font-extrabold text-white leading-none">{counts.totalPending}</span>
          <span className="text-sm sm:text-lg text-white/80 font-medium">פריטים ממתינים לטיפול</span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-px bg-border">
        {BANNER_KEYS.map(s => {
          const isActive = active === s.key
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onToggle(s.key)}
              className={`bg-card flex flex-col items-center px-1 sm:px-3 py-3 sm:py-4 transition-colors cursor-pointer hover:bg-muted-surface/50 ${isActive ? 'ring-2 ring-inset ring-primary' : ''}`}
            >
              <span className="text-muted">{s.icon}</span>
              <span className="text-lg sm:text-2xl font-bold leading-none mt-1 text-foreground">{counts[s.key] ?? 0}</span>
              <span className="text-[10px] sm:text-xs mt-1 text-center leading-tight text-muted">{s.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Status Tiles                                                       */
/* ------------------------------------------------------------------ */

const TILE_DEFS: { key: Section; label: string; color: string; bg: string }[] = [
  { key: 'awaiting_order',   label: 'ממתין להזמנה',  color: '#dc2626', bg: 'bg-red-50' },
  { key: 'awaiting_receipt', label: 'ממתין לקבלה',   color: '#f59e0b', bg: 'bg-amber-50' },
  { key: 'received',         label: 'התקבל',          color: '#3b82f6', bg: 'bg-blue-50' },
  { key: 'wear',             label: 'בלאי',           color: '#8b5cf6', bg: 'bg-purple-50' },
]

function StatusTiles({ counts, active, onToggle }: {
  counts: Record<string, number>
  active: Section | null
  onToggle: (s: Section) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {TILE_DEFS.map(t => {
        const isActive = active === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onToggle(t.key)}
            className={`rounded-xl border overflow-hidden flex flex-col ${t.bg} transition-opacity hover:opacity-90 text-start ${isActive ? 'ring-2 ring-primary border-primary' : 'border-border'}`}
          >
            <div className="h-1" style={{ backgroundColor: t.color }} />
            <div className="flex flex-col items-center py-3 px-1">
              <span className="text-xl sm:text-3xl font-bold" style={{ color: t.color }}>{counts[t.key] ?? 0}</span>
              <span className="text-[9px] sm:text-xs text-foreground text-center mt-1 leading-tight">{t.label}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Inventory Overview                                                 */
/* ------------------------------------------------------------------ */

const OVERVIEW_DEFS: { key: Section; icon: ReactNode; label: string; tone: string }[] = [
  { key: 'not_consumed',   icon: <IconBox size={20} />,                  label: 'פריטים שלא נצרכו', tone: 'text-warning' },
  { key: 'delivered',      icon: <IconCheck size={20} />,                label: 'נופקו החודש',       tone: 'text-success' },
  { key: 'rejected_final', icon: <IconBan size={20} color="#6b7280" />,  label: 'נדחו סופית',        tone: 'text-muted' },
  { key: 'wear_credited',  icon: <IconTruck size={20} />,                label: 'בלאי מזוכה',        tone: 'text-foreground' },
]

function InventoryOverview({ counts, active, onToggle }: {
  counts: Record<string, number>
  active: Section | null
  onToggle: (s: Section) => void
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">סיכום מלאי ופעילות</h2>
      </CardHeader>
      <CardBody className="p-0">
        {OVERVIEW_DEFS.map(d => {
          const isActive = active === d.key
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onToggle(d.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors cursor-pointer hover:bg-muted-surface/50 ${isActive ? 'bg-muted-surface' : ''}`}
            >
              <span className="shrink-0">{d.icon}</span>
              <span className="flex-1 text-sm text-foreground text-start">{d.label}</span>
              <span className={`text-lg font-bold ${d.tone}`}>{counts[d.key] ?? 0}</span>
            </button>
          )
        })}
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Quick Actions                                                      */
/* ------------------------------------------------------------------ */

function QuickActions({ active, onToggle }: { active: Section | null; onToggle: (s: Section) => void }) {
  const isActive = active === 'catalog'
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">פעולות מהירות</h2>
      </CardHeader>
      <CardBody className="p-0">
        <button
          type="button"
          onClick={() => onToggle('catalog')}
          className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border transition-colors cursor-pointer hover:bg-muted-surface ${isActive ? 'bg-muted-surface' : ''}`}
        >
          <span className="text-muted"><IconList size={20} /></span>
          <span className="flex-1 text-sm font-medium text-foreground text-start">ניהול מחסן</span>
          <IconArrowLeft size={16} />
        </button>
        <Link
          to="/warehouse/inventory-count"
          className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted-surface transition-colors"
        >
          <span className="text-muted"><IconClipboard size={20} /></span>
          <span className="flex-1 text-sm font-medium text-foreground">ספירת מלאי</span>
          <IconArrowLeft size={16} />
        </Link>
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Top Delivered Table (not clickable)                                */
/* ------------------------------------------------------------------ */

function TopDeliveredTable({ rows, onHide }: { rows: TopPart[]; onHide: (sku: string) => void }) {
  const [confirmSku, setConfirmSku] = useState<string | null>(null)

  if (rows.length === 0) return null
  return (
    <>
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">פריטים בשימוש גבוה</h2>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted-surface text-muted">
              <tr>
                <th className="text-start px-3 py-2">מק״ט</th>
                <th className="text-start px-3 py-2">שם</th>
                <th className="text-start px-3 py-2">כמות</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.sku} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-foreground">{r.sku}</td>
                  <td className="px-3 py-2 text-foreground">{r.name}</td>
                  <td className="px-3 py-2 font-bold text-foreground">{r.total}</td>
                  <td className="px-1 py-2">
                    <button
                      type="button"
                      onClick={() => setConfirmSku(r.sku)}
                      className="p-1 rounded hover:bg-muted-surface text-muted hover:text-foreground transition-colors"
                      title="הסתר פריט מטבלה זו"
                    >
                      <IconEyeOff size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {confirmSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmSku(null)}>
          <div className="bg-card rounded-xl shadow-xl p-5 mx-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-foreground mb-4">
              להסתיר את מק״ט <span className="font-mono font-bold">{confirmSku}</span> מטבלת פריטים בשימוש גבוה?
            </p>
            <p className="text-xs text-muted mb-4">ניתן לבטל הסתרה בדף הגדרות.</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmSku(null)}
                className="px-3 py-1.5 text-sm rounded-md border border-border text-foreground hover:bg-muted-surface"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={() => { onHide(confirmSku); setConfirmSku(null) }}
                className="px-3 py-1.5 text-sm rounded-md text-white"
                style={{ backgroundColor: NAVY }}
              >
                הסתר
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const BANNER_SET = new Set<Section>(['rejected', 'blocked', 'pending_special', 'low_stock', 'overdue_receipt'])
const TILE_SET   = new Set<Section>(['awaiting_order', 'awaiting_receipt', 'received', 'wear'])
const OVERVIEW_SET = new Set<Section>(['not_consumed', 'delivered', 'rejected_final', 'wear_credited'])

export function WarehouseDashboardPage() {
  const { data: pending, isLoading: loadingPending } = usePendingActions()
  const { data: parts, isLoading: loadingParts } = useParts()
  const { data: settings } = useAppSettings()
  const employee = useAuthStore((s) => s.employee)
  const queryClient = useQueryClient()
  const [active, setActive] = useState<Section | null>(null)

  function toggle(s: Section) {
    setActive(prev => prev === s ? null : s)
  }

  const hiddenSkus: string[] = useMemo(() => {
    if (!settings?.[HIDDEN_TOP_PARTS_KEY]) return []
    try { return JSON.parse(settings[HIDDEN_TOP_PARTS_KEY]) } catch { return [] }
  }, [settings])

  const handleHidePart = useCallback(async (sku: string) => {
    if (!employee) return
    const next = [...new Set([...hiddenSkus, sku])]
    await setAppSetting(employee.employee_number, HIDDEN_TOP_PARTS_KEY, JSON.stringify(next))
    queryClient.invalidateQueries({ queryKey: ['app_settings'] })
  }, [employee, hiddenSkus, queryClient])

  const computed = useMemo(() => {
    const rows = pending ?? []
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const byStatus = (s: string) => rows.filter(r => r.status === s)
    const awaitingReceipt = byStatus('awaiting_receipt')
    const delivered       = byStatus('delivered')
    const wearCredited    = byStatus('wear_credited')
    const rejectedFinal   = byStatus('rejected_final')

    const overdueReceipt = awaitingReceipt.filter(r => {
      const since = r.awaiting_receipt_since ?? r.requested_at
      return (Date.now() - new Date(since).getTime()) / HOUR >= 48
    })
    const blockedRows = rows.filter(r => r.parts?.is_sku_blocked && !r.parts?.hide_from_blocked_table)
    const deliveredThisMonth = delivered.filter(r => {
      const w = r.part_withdrawals?.[0]?.withdrawn_at
      return w && new Date(w) >= monthStart
    })
    const wearCreditedThisMonth = wearCredited.filter(r => new Date(r.requested_at) >= monthStart)
    const rejectedFinalThisMonth = rejectedFinal.filter(r => new Date(r.requested_at) >= monthStart)

    const catalog = parts ?? []
    const lowStockParts = catalog.filter(p => p.quantity < p.min_threshold)

    const sectionRows: Record<string, PendingPart[]> = {
      rejected:        byStatus('rejected'),
      pending_special: byStatus('pending_special_approval'),
      blocked:         blockedRows,
      overdue_receipt: overdueReceipt,
      awaiting_order:  byStatus('awaiting_order'),
      awaiting_receipt: awaitingReceipt,
      received:        byStatus('received'),
      wear:            byStatus('wear'),
      not_consumed:    byStatus('not_consumed'),
      delivered:       deliveredThisMonth,
      rejected_final:  rejectedFinalThisMonth,
      wear_credited:   wearCreditedThisMonth,
    }

    const counts: Record<string, number> = {}
    for (const [k, v] of Object.entries(sectionRows)) counts[k] = v.length
    counts.low_stock = lowStockParts.length
    counts.totalPending = counts.rejected + counts.blocked + counts.pending_special +
      counts.low_stock + counts.overdue_receipt

    const hiddenSet = new Set(hiddenSkus)
    const topDelivered = topDeliveredParts(delivered).filter(p => !hiddenSet.has(p.sku))

    return { sectionRows, lowStockParts, counts, topDelivered }
  }, [pending, parts, hiddenSkus])

  const isLoading = loadingPending || loadingParts

  function renderExpanded(keys: Set<Section>) {
    if (!active || !keys.has(active)) return null
    if (active === 'low_stock') {
      return <ExpandedPanel><LowStockList rows={computed.lowStockParts} /></ExpandedPanel>
    }
    const rows = computed.sectionRows[active] ?? []
    return <ExpandedPanel><PendingList rows={rows} /></ExpandedPanel>
  }

  return (
    <>
      <AppHeader subtitle="לוח בקרה · מחסן" />
      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-3">
        {isLoading ? (
          <p className="text-sm text-muted text-center py-8">טוען...</p>
        ) : (
          <>
            <TopStatsBar counts={computed.counts} active={active} onToggle={toggle} />
            {renderExpanded(BANNER_SET)}

            <StatusTiles counts={computed.counts} active={active} onToggle={toggle} />
            {renderExpanded(TILE_SET)}

            <InventoryOverview counts={computed.counts} active={active} onToggle={toggle} />
            {renderExpanded(OVERVIEW_SET)}

            <TopDeliveredTable rows={computed.topDelivered} onHide={handleHidePart} />

            <QuickActions active={active} onToggle={toggle} />
            {active === 'catalog' && parts && <PartsCatalogList parts={parts} />}
          </>
        )}
      </main>
    </>
  )
}
