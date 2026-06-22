import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { usePendingActions } from '../hooks/usePendingActions'
import { useParts } from '../hooks/useParts'

const NAVY = '#232150'

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

function IconSearch({ size = 24, color = '#64748b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
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

function TopStatsBar({ total, rejected, blocked, lowStock, overdueReceipt, pendingSpecial }: {
  total: number; rejected: number; blocked: number; lowStock: number; overdueReceipt: number; pendingSpecial: number
}) {
  const secondary: Array<{ icon: ReactNode; value: ReactNode; label: string }> = [
    { icon: <IconWarning size={18} />,                   value: rejected,       label: 'מק״טים שנדחו' },
    { icon: <IconBan size={18} color="#dc2626" />,       value: blocked,        label: 'מק״טים חסומים' },
    { icon: <IconClipboard size={18} color="#f59e0b" />, value: pendingSpecial, label: 'ממתין לאישור מיוחד' },
    { icon: <IconBox size={18} color="#f59e0b" />,       value: lowStock,       label: 'מלאי נמוך' },
    { icon: <IconTruck size={18} color="#dc2626" />,     value: overdueReceipt, label: 'ממתינים זמן רב' },
  ]

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-5 sm:py-6 text-center" style={{ backgroundColor: NAVY }}>
        <div className="flex items-center justify-center gap-3">
          <IconBox size={28} color="#fff" />
          <span className="text-3xl sm:text-5xl font-extrabold text-white leading-none">{total}</span>
          <span className="text-sm sm:text-lg text-white/80 font-medium">פריטים ממתינים לטיפול</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-px bg-border">
        {secondary.map(s => (
          <div
            key={s.label}
            className="bg-card flex flex-col items-center px-1 sm:px-3 py-3 sm:py-4"
          >
            <span className="text-muted">{s.icon}</span>
            <span className="text-lg sm:text-2xl font-bold leading-none mt-1 text-foreground">{s.value}</span>
            <span className="text-[10px] sm:text-xs mt-1 text-center leading-tight text-muted">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function WarehouseDashboardPage() {
  const { data: pending, isLoading: loadingPending } = usePendingActions()
  const { data: parts, isLoading: loadingParts } = useParts()

  const stats = useMemo(() => {
    const rows = pending ?? []
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const awaitingOrder   = rows.filter(r => r.status === 'awaiting_order')
    const awaitingReceipt = rows.filter(r => r.status === 'awaiting_receipt')
    const received        = rows.filter(r => r.status === 'received')
    const wear            = rows.filter(r => r.status === 'wear')
    const rejected        = rows.filter(r => r.status === 'rejected')
    const pendingSpecial  = rows.filter(r => r.status === 'pending_special_approval')
    const notConsumed     = rows.filter(r => r.status === 'not_consumed')
    const delivered       = rows.filter(r => r.status === 'delivered')
    const wearCredited    = rows.filter(r => r.status === 'wear_credited')
    const rejectedFinal   = rows.filter(r => r.status === 'rejected_final')

    const deliveredThisMonth = delivered.filter(r => {
      const w = r.part_withdrawals?.[0]?.withdrawn_at
      return w && new Date(w) >= monthStart
    })
    const wearCreditedThisMonth = wearCredited.filter(r => {
      const d = r.requested_at
      return d && new Date(d) >= monthStart
    })
    const rejectedFinalThisMonth = rejectedFinal.filter(r => {
      const d = r.requested_at
      return d && new Date(d) >= monthStart
    })

    const HOUR = 3_600_000
    const overdueReceipt = awaitingReceipt.filter(r => {
      const since = r.awaiting_receipt_since ?? r.requested_at
      return (Date.now() - new Date(since).getTime()) / HOUR >= 48
    })

    const blockedRows = rows.filter(r => r.parts?.is_sku_blocked && !r.parts?.hide_from_blocked_table)

    const catalog = parts ?? []
    const lowStock = catalog.filter(p => p.quantity < p.min_threshold)
    const totalSkus = new Set(catalog.map(p => p.sku)).size

    const totalPending = awaitingOrder.length + awaitingReceipt.length + received.length + wear.length

    return {
      totalPending,
      awaitingOrder: awaitingOrder.length,
      awaitingReceipt: awaitingReceipt.length,
      received: received.length,
      wear: wear.length,
      rejected: rejected.length,
      notConsumed: notConsumed.length,
      lowStock: lowStock.length,
      blocked: blockedRows.length,
      totalSkus,
      deliveredThisMonth: deliveredThisMonth.length,
      wearCreditedThisMonth: wearCreditedThisMonth.length,
      rejectedFinalThisMonth: rejectedFinalThisMonth.length,
      overdueReceipt: overdueReceipt.length,
      pendingSpecial: pendingSpecial.length,
    }
  }, [pending, parts])

  const isLoading = loadingPending || loadingParts

  return (
    <>
      <AppHeader subtitle="לוח בקרה · מחסן" />
      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-3">
        {isLoading ? (
          <p className="text-sm text-muted text-center py-8">טוען...</p>
        ) : (
          <>
            <TopStatsBar
              total={stats.totalPending}
              rejected={stats.rejected}
              blocked={stats.blocked}
              lowStock={stats.lowStock}
              overdueReceipt={stats.overdueReceipt}
              pendingSpecial={stats.pendingSpecial}
            />
            <StatusTiles
              awaitingOrder={stats.awaitingOrder}
              awaitingReceipt={stats.awaitingReceipt}
              received={stats.received}
              wear={stats.wear}
            />
            <InventoryOverview
              lowStock={stats.lowStock}
              blocked={stats.blocked}
              rejected={stats.rejected}
              notConsumed={stats.notConsumed}
              totalSkus={stats.totalSkus}
            />
            <QuickActions />
          </>
        )}
      </main>
    </>
  )
}



function StatusTiles({ awaitingOrder, awaitingReceipt, received, wear }: {
  awaitingOrder: number; awaitingReceipt: number; received: number; wear: number
}) {
  const tiles: Array<{ label: string; value: number; color: string; bg: string; tab: string }> = [
    { label: 'ממתין להזמנה',    value: awaitingOrder,   color: '#dc2626', bg: 'bg-red-50',    tab: 'awaiting_order' },
    { label: 'ממתין לקבלה',     value: awaitingReceipt, color: '#f59e0b', bg: 'bg-amber-50',  tab: 'awaiting_receipt' },
    { label: 'התקבל',            value: received,        color: '#3b82f6', bg: 'bg-blue-50',   tab: 'received' },
    { label: 'בלאי',             value: wear,            color: '#8b5cf6', bg: 'bg-purple-50', tab: 'wear' },
  ]

  return (
    <div className="grid grid-cols-4 gap-2">
      {tiles.map(t => (
        <Link
          key={t.tab}
          to={`/warehouse?actab=${t.tab}`}
          className={`rounded-xl border border-border overflow-hidden flex flex-col ${t.bg} transition-opacity hover:opacity-90`}
        >
          <div className="h-1" style={{ backgroundColor: t.color }} />
          <div className="flex flex-col items-center py-3 px-1">
            <span className="text-xl sm:text-3xl font-bold" style={{ color: t.color }}>{t.value}</span>
            <span className="text-[9px] sm:text-xs text-foreground text-center mt-1 leading-tight">{t.label}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

function IssueRow({ icon, label, count, tone }: { icon: ReactNode; label: string; count: number; tone: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-sm text-foreground">{label}</span>
      <span className={`text-lg font-bold ${tone}`}>{count}</span>
    </div>
  )
}

function InventoryOverview({ lowStock, blocked, rejected, notConsumed, totalSkus }: {
  lowStock: number; blocked: number; rejected: number; notConsumed: number; totalSkus: number
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">סיכום מלאי ופעילות</h2>
      </CardHeader>
      <CardBody className="p-0">
        <IssueRow icon={<IconWarning size={20} />}    label="מלאי נמוך"          count={lowStock}    tone="text-warning" />
        <IssueRow icon={<IconBan size={20} />}        label='מק״טים חסומים'      count={blocked}     tone="text-danger" />
        <IssueRow icon={<IconClipboard size={20} />}  label="פריטים שנדחו"       count={rejected}    tone="text-danger" />
        <IssueRow icon={<IconBox size={20} />}        label="פריטים שלא נצרכו"   count={notConsumed} tone="text-warning" />
        <IssueRow icon={<IconSearch size={20} />}     label='מק״טים בקטלוג'      count={totalSkus}   tone="text-foreground" />
      </CardBody>
    </Card>
  )
}

function QuickActions() {
  const actions: Array<{ to: string; icon: ReactNode; label: string }> = [
    { to: '/warehouse',                 icon: <IconList size={20} />,      label: 'ניהול מחסן' },
    { to: '/warehouse/inventory-count', icon: <IconClipboard size={20} />, label: 'ספירת מלאי' },
    { to: '/technician',               icon: <IconSearch size={20} />,    label: 'דף כלים' },
  ]

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">פעולות מהירות</h2>
      </CardHeader>
      <CardBody className="p-0">
        {actions.map(a => (
          <Link
            key={a.to}
            to={a.to}
            className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted-surface transition-colors"
          >
            <span className="text-muted">{a.icon}</span>
            <span className="flex-1 text-sm font-medium text-foreground">{a.label}</span>
            <IconArrowLeft size={16} />
          </Link>
        ))}
      </CardBody>
    </Card>
  )
}
