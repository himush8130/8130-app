import { useState, useMemo, Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { useAuthStore } from '../store/auth'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DonutChart } from '../components/DonutChart'
import { useDashboardData, type DashboardData, type DashboardCompany } from '../hooks/useDashboardData'
import { useMonthlyMaintenanceCompany } from '../hooks/useTankMaintenance'
import { usePriorityConfig, priorityScore, DEFAULT_IMPORTANCE, MAX_IMPORTANCE } from '../hooks/usePriorityConfig'

/* ------------------------------------------------------------------ */
/*  Company colour palette                                             */
/* ------------------------------------------------------------------ */

const COMPANY_THEME: Record<string, { fill: string; bg: string; text: string; hBg: string; hText: string }> = {
  'פלוגה מ': { fill: '#16a34a', bg: 'bg-green-50',  text: 'text-green-700',  hBg: 'bg-green-100',  hText: 'text-green-800' },
  'פלוגה ל': { fill: '#2563eb', bg: 'bg-blue-50',   text: 'text-blue-700',   hBg: 'bg-blue-100',   hText: 'text-blue-800' },
  'פלוגה כ': { fill: '#ea580c', bg: 'bg-orange-50', text: 'text-orange-700', hBg: 'bg-orange-100', hText: 'text-orange-800' },
  'מפג״ד':  { fill: '#dc2626', bg: 'bg-red-50',    text: 'text-red-700',    hBg: 'bg-red-100',    hText: 'text-red-800' },
}
const FALLBACK = { fill: '#6b7280', bg: 'bg-gray-50', text: 'text-gray-700', hBg: 'bg-gray-100', hText: 'text-gray-800' }
function ct(label: string) { return COMPANY_THEME[label] ?? FALLBACK }

/** Deep navy used for the highlighted "קריאות פתוחות" stat (per mockup). */
const STAT_NAVY = '#232150'

function readTone(pct: number) { return pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-danger' }


/* ------------------------------------------------------------------ */
/*  Professional line icons (Lucide-style stroke set)                  */
/* ------------------------------------------------------------------ */

interface IconProps { size?: number; color?: string }

function IconWarning({ size = 34 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
            fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9v4" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1.1" fill="#f59e0b" />
    </svg>
  )
}

function IconShield({ size = 34, color = '#4f46e5' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function IconClipboard({ size = 34, color = '#64748b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  )
}

function IconWrench({ size = 34, color = '#64748b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
    </svg>
  )
}

function IconBox({ size = 24, color = '#64748b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  )
}

function IconChat({ size = 24, color = '#64748b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconStar({ size = 24, color = '#64748b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
    </svg>
  )
}

function IconCalendar({ size = 34, color = '#64748b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconClock({ size = 24, color = '#64748b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  )
}

function IconTarget({ size = 40, color = '#64748b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="13" r="9" /><circle cx="11" cy="13" r="5" /><circle cx="11" cy="13" r="1.2" fill={color} />
      <path d="m15 9 3-3m0 0V3.5m0 2.5h2.5" />
    </svg>
  )
}

/** Detailed side-profile tank silhouette (barrel pointing right), filled
 *  in the company colour with white wheel-hubs — matches the mockup. */
function TankIcon({ color = '#666', size = 64 }: { color?: string; size?: number }) {
  return (
    <svg viewBox="0 0 140 80" width={size} height={(size * 80) / 140} fill={color} aria-hidden>
      {/* gun barrel */}
      <rect x="84" y="29" width="54" height="5" rx="2.5" />
      {/* turret + sloped sides */}
      <path d="M44 26 C46 13 66 10 84 17 L87 31 L42 33 Z" />
      {/* commander cupola / hatch */}
      <rect x="55" y="9" width="15" height="9" rx="2.5" />
      {/* upper hull (angled glacis front) */}
      <path d="M13 33 L99 33 L93 49 L25 49 L13 42 Z" />
      {/* track assembly */}
      <rect x="9" y="43" width="98" height="17" rx="8.5" />
      {/* road-wheel hubs */}
      <g fill="#fff">
        <circle cx="23" cy="51.5" r="3.3" />
        <circle cx="37" cy="51.5" r="3.3" />
        <circle cx="51" cy="51.5" r="3.3" />
        <circle cx="65" cy="51.5" r="3.3" />
        <circle cx="79" cy="51.5" r="3.3" />
        <circle cx="93" cy="51.5" r="3.3" />
      </g>
    </svg>
  )
}

/* ================================================================== */
/*  SECTION 1 — Top Stats Bar                                         */
/* ================================================================== */

function TopStatsBar({ d }: { d: DashboardData }) {
  const { data: mm } = useMonthlyMaintenanceCompany()
  const employee = useAuthStore((s) => s.employee)
  const canLinkCalls = employee?.permissions === 'manager'

  // Order is RTL right→left: highlighted open-calls (right), then the
  // four metrics, ending with the placeholder "חריגות טיפול" (left).
  const STATS: Array<{ key: string; icon: ReactNode; value: ReactNode; label: string; sub?: ReactNode; highlight?: boolean; to?: string }> = [
    { key: 'open',  icon: <IconClipboard size={20} color="#fff" />, value: d.totalOpenCalls,                label: 'קריאות פתוחות', highlight: true, to: canLinkCalls ? '/manager/calls' : undefined },
    { key: 'dis',   icon: <IconWrench size={16} />,    value: d.totalDisabling,                label: 'משביתות' },
    {
      key: 'monthly',
      icon: <IconCalendar size={16} />,
      value: <span className="text-xs sm:text-sm lg:text-xl whitespace-nowrap">{mm?.thisWeekCompany ?? 'אין'}</span>,
      label: 'טיפול חודשי',
    },
    { key: 'ready', icon: <IconShield size={16} />,    value: `${d.overallTankReadinessPct}%`, label: 'כשירות כוללת' },
    { key: 'dev',   icon: <IconWarning size={16} />,   value: d.treatmentDeviations ?? 0,      label: 'חריגות טיפול' },
  ]
  return (
    // Single row of 5 at every width; sizes scale down on phones so the
    // whole bar fits. `gap-px` over a border-coloured background paints
    // the divider lines between segments automatically.
    <nav className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-px bg-border rounded-2xl border border-border overflow-hidden">
      {STATS.map((s) => {
        const cls = `flex flex-col items-center px-1 sm:px-3 py-3 lg:py-4 ${
          s.highlight ? 'text-white' : 'bg-card'
        }`
        const style = s.highlight ? { backgroundColor: STAT_NAVY } : undefined
        const content = (
          <>
            <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
              <div className="flex items-center justify-center gap-1">
                {s.icon}
                <span className={`font-bold leading-none ${s.highlight ? 'text-xl sm:text-3xl lg:text-4xl' : 'text-lg sm:text-2xl lg:text-3xl text-foreground'}`}>{s.value}</span>
              </div>
              {s.sub && <span className="text-[9px] sm:text-[10px] text-muted text-center leading-tight">{s.sub}</span>}
            </div>
            <span className={`text-[10px] sm:text-xs lg:text-sm text-center mt-0.5 leading-tight ${s.highlight ? 'opacity-90' : 'text-muted'}`}>{s.label}</span>
          </>
        )
        return s.to ? (
          <Link key={s.key} to={s.to} className={cls} style={style}>{content}</Link>
        ) : (
          <div key={s.key} className={cls} style={style}>{content}</div>
        )
      })}
    </nav>
  )
}

/* ================================================================== */
/*  SECTION 2 — Company Status Cards                                  */
/* ================================================================== */

function CompanyStatusSection({ d }: { d: DashboardData }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4">
      {d.companies.map(c => <CompanyCard key={c.label} co={c} />)}
    </div>
  )
}

function CompanyCard({ co }: { co: DashboardCompany }) {
  const t = ct(co.label)
  const disabling = co.disabling
  // Big headline = total open calls; the breakdown splits those into
  // disabling (משביתות) and the rest (פתוחות).
  const regular = Math.max(0, co.openCalls - disabling)
  return (
    <div className={`rounded-xl sm:rounded-2xl border border-border overflow-hidden flex flex-col ${t.bg}`}>
      {/* top accent line */}
      <div className="h-1 sm:h-1.5" style={{ backgroundColor: t.fill }} />

      <span className={`px-1 sm:px-4 pt-1 sm:pt-1.5 text-center text-xs sm:text-base font-bold ${t.text}`}>{co.label}</span>

      <div className="px-1 sm:px-4 pt-0.5 pb-0.5 sm:pb-1 flex flex-col items-center">
        <TankIcon color={t.fill} size={40} />
        <span className={`text-2xl sm:text-4xl font-bold ${t.text}`}>{co.openCalls}</span>
      </div>

      <div className="px-2 sm:px-5">
        <div className="border-t border-black/10 pt-1 sm:pt-1.5 pb-0.5 flex flex-col gap-0">
          <div className="flex items-center justify-between gap-1">
            <span className={`text-base sm:text-2xl font-bold ${t.text}`}>{disabling}</span>
            <span className="text-[10px] sm:text-sm text-foreground">משביתות</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`text-base sm:text-2xl font-bold ${t.text}`}>{regular}</span>
            <span className="text-[10px] sm:text-sm text-foreground">פתוחות</span>
          </div>
        </div>
      </div>

      {/* bottom accent pill */}
      <div className="mx-2 sm:mx-4 mt-0.5 mb-1 sm:mb-1.5 h-1 sm:h-1.5 rounded-full" style={{ backgroundColor: t.fill }} />
    </div>
  )
}

/* ================================================================== */
/*  SECTION 3 — Priority Company                                      */
/* ================================================================== */

export function PriorityCompanySection({ d }: { d: DashboardData }) {
  const { weights, importance } = usePriorityConfig()

  // Score every company and pick the highest.
  const ranked = useMemo(() => {
    return d.companies
      .map(c => ({
        co: c,
        rating: importance[c.label] ?? DEFAULT_IMPORTANCE,
        score: priorityScore(c, weights, importance[c.label] ?? DEFAULT_IMPORTANCE),
      }))
      .sort((a, b) => b.score - a.score)
  }, [d.companies, weights, importance])

  const top = ranked[0]
  if (!top) return null
  const co = top.co
  const t = ct(co.label)

  // RTL right→left: משביתות, קריאות פתוחות, חשיבות מבצעית,
  // קצב סגירה, חלקים שהתקבלו.
  const metrics = [
    { icon: <IconWrench size={18} />, label: 'משביתות',          value: co.disabledTanks },
    { icon: <IconChat size={18} />,   label: 'קריאות פתוחות',     value: co.openCalls },
    { icon: <IconStar size={18} />,   label: 'חשיבות מבצעית',     value: `${top.rating}/${MAX_IMPORTANCE}` },
    { icon: <IconClock size={18} />,  label: 'קצב סגירה',          value: co.closedLast14 },
    { icon: <IconBox size={18} />,    label: 'חלקים שהתקבלו',     value: co.receivedCalls },
  ]

  return (
    <Card>
      <CardBody className="px-1 sm:px-2">
        {/* Single row at every width: target + score, then the metrics. */}
        <div className="flex items-stretch gap-0 sm:gap-0.5">
          {/* Priority company + score (right side in RTL). */}
          <div className="dev-cube flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
            <IconTarget size={36} color={t.fill} />
            <div className="min-w-0 flex-1">
              <div className="text-[9px] sm:text-xs text-muted leading-tight">פלוגה לתיעדוף</div>
              <div className={`text-sm sm:text-xl font-bold leading-tight ${t.text}`}>{co.label}</div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="hidden sm:inline text-xs text-muted shrink-0">ציון תיעדוף</span>
                <span dir="ltr" className="font-bold">
                  <span className={`text-base sm:text-lg ${t.text}`}>{top.score}</span>
                  <span className="text-muted text-[10px] sm:text-xs font-normal">/100</span>
                </span>
              </div>
              <div dir="ltr" className="w-4/5 max-w-48 bg-border rounded-full h-1.5 sm:h-2 mt-1">
                <div className="h-full rounded-full" style={{ width: `${top.score}%`, backgroundColor: t.fill }} />
              </div>
            </div>
          </div>

          {/* Prominent divider separating the score block from the metrics. */}
          <span aria-hidden className="dev-divider w-0.5 bg-border self-stretch rounded-full shrink-0" />

          {/* Metric strip — fixed width so the equal cells give small,
              symmetric centre↔divider gaps; the cube takes the rest. */}
          <div className="shrink-0 w-[250px] flex items-stretch">
            {metrics.map((m, i) => (
              <Fragment key={m.label}>
                {i > 0 && <span aria-hidden className="dev-divider my-1 w-px bg-border" />}
                <MetricBox {...m} />
              </Fragment>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function MetricBox({ icon, label, value, sub, className = '' }: { icon: ReactNode; label: string; value: ReactNode; sub?: string; className?: string }) {
  return (
    <div className={`dev-metric flex-1 min-w-0 flex flex-col items-center gap-0.5 sm:gap-1 px-0 sm:px-0.5 text-center ${className}`}>
      <span className="text-muted">{icon}</span>
      {/* Fixed two-line height so every metric's number sits on the same row. */}
      <span className="text-[9px] sm:text-[11px] text-muted leading-tight min-h-[2.4em] flex items-center justify-center">{label}</span>
      <span className="text-sm sm:text-lg font-bold text-foreground leading-tight">{value}</span>
      {sub && <span className="text-[9px] sm:text-[10px] text-muted">{sub}</span>}
    </div>
  )
}

/* ================================================================== */
/*  SECTION 4 — Engine Hours Alerts                                   */
/* ================================================================== */

const RED_OVER = 200    // חריגה אדומה: מעל 200 שעות
const YELLOW_OVER = 150 // חריגה צהובה: מעל 150 שעות

function devTone(raw: number | null): { dot: string; text: string } {
  if (raw != null && raw > RED_OVER)    return { dot: 'bg-danger',  text: 'text-danger font-medium' }
  if (raw != null && raw > YELLOW_OVER) return { dot: 'bg-warning', text: 'text-warning font-medium' }
  return { dot: 'bg-muted', text: 'text-muted' }
}

function devLabel(raw: number | null): string {
  if (raw == null) return '—'
  if (raw > 0) return `חריגה ב-${raw} שעות`
  if (raw === 0) return 'על הסף'
  return `${-raw} שעות לחריגה`
}

function EngineAlertsSection({ d }: { d: DashboardData }) {
  const [showAll, setShowAll] = useState(false)

  // allTanksEngine is pre-sorted by rawDeviation desc. Alerts = red+yellow
  // (raw > 150). If fewer than 3 alerts, top up to 3 with the next-closest
  // tanks so the table always shows at least three rows.
  const rows = useMemo(() => {
    const known = d.allTanksEngine.filter(t => t.rawDeviation != null)
    if (showAll) return known
    const alerts = known.filter(t => (t.rawDeviation as number) > YELLOW_OVER)
    return alerts.length >= 3 ? alerts : known.slice(0, 3)
  }, [d.allTanksEngine, showAll])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-foreground">התראות שעות מנוע</h2>
            <p className="text-[10px] text-muted">מעקב טנקים לפי שעות טיפול</p>
          </div>
          <button
            onClick={() => setShowAll(v => !v)}
            className="text-xs px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted-surface transition-colors"
          >
            {showAll ? 'הצג חריגות בלבד' : 'לצפייה בכל הטנקים'}
          </button>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">אין נתוני שעות מנוע</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-muted-surface text-muted">
              <tr>
                <th className="text-start px-3 py-2">טנק</th>
                <th className="text-start px-3 py-2">פלוגה</th>
                <th className="text-start px-3 py-2">שעות מנוע</th>
                <th className="text-start px-3 py-2">חריגה</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(a => {
                const tone = devTone(a.rawDeviation)
                return (
                  <tr key={a.vehicleNumber} className="border-t border-border">
                    <td className="px-3 py-2 font-mono">
                      <span className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${tone.dot}`} />
                        {a.vehicleNumber}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{a.company}</td>
                    <td className="px-3 py-2 font-mono">{a.engineHours != null ? a.engineHours : '—'}</td>
                    <td className={`px-3 py-2 ${tone.text}`}>{devLabel(a.rawDeviation)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </CardBody>
    </Card>
  )
}

/* ================================================================== */
/*  SECTION 5 — Tank Readiness (donut charts)                         */
/* ================================================================== */

function TankReadinessSection({ d }: { d: DashboardData }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-foreground">כשירות טנקים</h2>
          <span className="text-xs text-muted">
            סה״כ {d.totalTanks} טנקים ·{' '}
            <strong className={readTone(d.overallTankReadinessPct)}>{d.overallTankReadinessPct}%</strong>
          </span>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <div className="flex items-stretch">
          {d.tankReadiness.map((r, i) => {
            const t = ct(r.company)
            return (
              <Fragment key={r.company}>
                {i > 0 && <span aria-hidden className="my-6 lg:my-8 w-px bg-border" />}
                <div className="flex-1 flex flex-col items-center justify-between pt-3 sm:pt-4 pb-3 gap-3 sm:gap-4">
                  <span className={`text-xs sm:text-sm font-bold ${t.text}`}>{r.company}</span>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3">
                    <DonutChart
                      segments={[
                        { value: r.operational, color: t.fill },
                        { value: r.total - r.operational, color: 'var(--color-border)' },
                      ]}
                      centerLabel=""
                      size={64}
                      thickness={16}
                    />
                    <div className="flex flex-col items-center sm:items-start leading-none">
                      <span className="text-lg sm:text-2xl font-bold text-foreground">{r.pct}%</span>
                      <span className="text-xs sm:text-sm text-muted mt-1 sm:mt-1.5">{r.operational}/{r.total}</span>
                    </div>
                  </div>
                  <div className="self-stretch mx-2 sm:mx-5 h-1.5 rounded-full" style={{ backgroundColor: t.fill }} />
                </div>
              </Fragment>
            )
          })}
        </div>
      </CardBody>
    </Card>
  )
}

/* ================================================================== */
/*  SECTION 6 — Wheeled Vehicle Readiness (table)                     */
/* ================================================================== */

function WheeledReadinessSection({ d }: { d: DashboardData }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? d.wheeledReadiness : d.wheeledReadiness.slice(0, 2)
  const remaining = d.wheeledReadiness.length - 2

  if (d.wheeledReadiness.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-foreground">כשירות גלגלי</h2>
          <span className="text-xs text-muted">
            סה״כ {d.totalWheeled} גלגלים · אחוז כשירות כללי{' '}
            <strong className={readTone(d.overallWheeledPct)}>{d.overallWheeledPct}%</strong>
          </span>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <table className="w-full text-xs">
          <thead className="bg-muted-surface text-muted">
            <tr>
              <th className="text-start px-3 py-2">מחלקה</th>
              <th className="text-start px-3 py-2">תת מחלקה</th>
              <th className="text-start px-3 py-2">תקין</th>
              <th className="text-start px-3 py-2">בעיות</th>
              <th className="text-start px-3 py-2">משביתות</th>
              <th className="text-start px-3 py-2">אחוז כשירות</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-3 py-2 font-medium text-foreground">{r.department}</td>
                <td className="px-3 py-2">{r.subDepartment}</td>
                <td className="px-3 py-2 text-success font-medium">{r.healthy}/{r.total}</td>
                <td className="px-3 py-2 text-warning font-medium">{r.issues}</td>
                <td className="px-3 py-2 text-danger font-medium">{r.disabled}</td>
                <td className={`px-3 py-2 font-semibold ${readTone(r.pct)}`}>{r.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {remaining > 0 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full py-2 text-xs text-muted hover:text-foreground border-t border-border"
          >
            ▼ הצג עוד ({remaining})
          </button>
        )}
      </CardBody>
    </Card>
  )
}

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */

export function ManagerDashboardPage() {
  const { data, isLoading } = useDashboardData()

  return (
    <>
      <AppHeader subtitle="פאנל ניהול חימוש גדודי" showLogo wide />
      <main className="max-w-6xl mx-auto p-4 flex flex-col gap-4">
        {isLoading || !data ? (
          <p className="text-sm text-muted text-center py-8">טוען...</p>
        ) : (
          <>
            <TopStatsBar d={data} />
            <CompanyStatusSection d={data} />
            <PriorityCompanySection d={data} />
            <EngineAlertsSection d={data} />
            <TankReadinessSection d={data} />
            <WheeledReadinessSection d={data} />
          </>
        )}
      </main>
    </>
  )
}
