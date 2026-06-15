import { useState, Fragment, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useFeedbackNotes } from '../hooks/useFeedbackNotes'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { hardReload } from '../lib/hardReload'
import { BUILD_TIME } from '../releaseNotes'

type ViewKey = 'manager' | 'dashboard' | 'vehicles' | 'warehouse' | 'technician'

const SVG = 'w-4 h-4 shrink-0'
const NAV_ICONS: Record<ViewKey, ReactNode> = {
  manager: (
    <svg className={SVG} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  dashboard: (
    <svg className={SVG} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  vehicles: (
    <svg className={SVG} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  ),
  warehouse: (
    <svg className={SVG} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  ),
  technician: (
    <svg className={SVG} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
    </svg>
  ),
}

const ALL_VIEWS: Array<{ key: ViewKey; to: string; label: string; matches: (p: string) => boolean }> = [
  { key: 'manager',    to: '/manager',            label: 'מנהל',           matches: (p) => p === '/manager' || (p.startsWith('/manager') && !p.startsWith('/manager/vehicles') && !p.startsWith('/manager/dashboard')) },
  { key: 'dashboard',  to: '/manager/dashboard',  label: 'לוח בקרה',       matches: (p) => p.startsWith('/manager/dashboard') },
  { key: 'vehicles',   to: '/manager/vehicles',   label: 'ספר רק״ם/כלי',   matches: (p) => p.startsWith('/manager/vehicles') },
  { key: 'warehouse',  to: '/warehouse',          label: 'מחסנאי',         matches: (p) => p.startsWith('/warehouse') },
  { key: 'technician', to: '/technician',         label: 'טכנאי',          matches: (p) => p.startsWith('/technician') },
]

const VIEWS_BY_ROLE: Record<'manager' | 'warehouse' | 'technician', ViewKey[]> = {
  manager:    ['manager', 'dashboard', 'vehicles', 'warehouse', 'technician'],
  warehouse:  ['warehouse', 'vehicles'],
  technician: ['vehicles', 'technician'],
}

// Shared button styling so every chip in the header row (יציאה,
// refresh, notes, feedback toggle) is the same height and has the
// same border + radius.
const CHIP_BASE = 'h-7 inline-flex items-center justify-center rounded-md border text-xs font-medium transition-colors disabled:opacity-50'
const CHIP_NEUTRAL = 'bg-card text-muted hover:text-foreground border-border hover:bg-muted-surface'
const CHIP_ICON = 'w-7'

export function AppHeader({ subtitle, showLogo, wide }: { subtitle?: string; showLogo?: boolean; wide?: boolean }) {
  const maxW = wide ? 'max-w-6xl' : 'max-w-3xl'
  const employee = useAuthStore((s) => s.employee)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const [refreshing, setRefreshing] = useState(false)
  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    await hardReload()
  }

  const [showBuildTime, setShowBuildTime] = useState(false)
  const buildTimeLabel = new Date(BUILD_TIME).toLocaleString('he-IL', {
    year:   'numeric',
    month:  '2-digit',
    day:    '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
  })
  function handleTitleClick() {
    setShowBuildTime(true)
    setTimeout(() => setShowBuildTime(false), 800)
  }

  const roleViews = employee
    ? VIEWS_BY_ROLE[employee.permissions]
        .map((k) => ALL_VIEWS.find((v) => v.key === k)!)
        .filter(Boolean)
    : []

  // Count open notes (status !== 'done') authored by *other* managers
  // — own notes don't count as "unread for me". Used to paint the
  // 📝 chip orange with a badge of the unread count.
  const { data: notes } = useFeedbackNotes()
  const openOthersCount = notes
    ? notes.filter(
        (n) =>
          n.status !== 'done' &&
          n.author_employee_number !== employee?.employee_number,
      ).length
    : 0

  return (
    <header className="bg-card border-b border-border">
      <ComponentBadge id={1001} />

      {/* Row 1: title (right) + uniform chip row (left). RTL reading
          order in the JSX below is right→left visually:
          [name] [🔧] [📝 notes] [⟳ refresh] [יציאה] */}
      <div className={`${maxW} mx-auto px-4 py-3 flex items-center justify-between gap-2`}>
        <div className="min-w-0 flex items-center gap-3">
          {showLogo && <img src="/logo.png" alt="8130" className="h-10 w-10 rounded-md object-contain" />}
          <div>
            <button
              type="button"
              onClick={handleTitleClick}
              className="text-lg font-bold text-foreground hover:opacity-90 active:opacity-75"
              title="הצג תאריך עדכון אחרון"
            >
              8130 APP
            </button>
            {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
          </div>
        </div>

        {employee && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted hidden sm:inline">{employee.name}</span>

            <span className="inline-flex items-center relative">
              <ComponentBadge id={1004} />
              <Link
                to="/notes"
                aria-label={openOthersCount > 0 ? `לוג הערות (${openOthersCount} פתוחות)` : 'לוג הערות'}
                title={openOthersCount > 0 ? `לוג הערות (${openOthersCount} פתוחות)` : 'לוג הערות'}
                className={`${CHIP_BASE} ${CHIP_ICON} text-base ${
                  openOthersCount > 0
                    ? 'bg-warning/15 text-warning border-warning hover:bg-warning/25'
                    : CHIP_NEUTRAL
                }`}
              >
                📝
              </Link>
              {openOthersCount > 0 && (
                <span
                  className="absolute -top-1 -start-1 min-w-[1.1rem] h-[1.1rem] px-1 inline-flex items-center justify-center rounded-full bg-warning text-white text-[10px] font-bold leading-none border border-card"
                  aria-hidden
                >
                  {openOthersCount}
                </span>
              )}
            </span>

            <span className="inline-flex items-center">
              <ComponentBadge id={1005} />
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="רענן נתונים ובדוק עדכון לאפליקציה"
                title="רענן נתונים ובדוק עדכון לאפליקציה"
                className={`${CHIP_BASE} ${CHIP_NEUTRAL} ${CHIP_ICON}`}
              >
                <span className="text-xl leading-none">⟳</span>
              </button>
            </span>

            <span className="inline-flex items-center">
              <ComponentBadge id={1002} />
              <button
                type="button"
                onClick={handleLogout}
                className={`${CHIP_BASE} ${CHIP_NEUTRAL} px-3`}
              >
                יציאה
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Floating build-time toast — fires when the user taps the
          title. Portal so it sits above everything else. */}
      {showBuildTime && typeof document !== 'undefined' && createPortal(
        <div
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div className="bg-foreground text-card px-4 py-2 rounded-md shadow-xl text-sm font-medium font-mono" dir="ltr">
            {buildTimeLabel}
          </div>
        </div>,
        document.body,
      )}

      {/* Row 2: per-role view switcher — one rounded segmented bar with
          partial dividers between inactive segments (the active segment
          is filled and butts flush against its neighbours). */}
      {roleViews.length > 0 && (
        <div className={`${maxW} mx-auto px-4 pb-3`}>
          <ComponentBadge id={3020} />
          <nav className="flex items-stretch rounded-lg border border-border bg-card overflow-hidden">
            {roleViews.map((v, i) => {
              const active = v.matches(location.pathname)
              const prevActive = i > 0 && roleViews[i - 1].matches(location.pathname)
              return (
                <Fragment key={v.to}>
                  {i > 0 && (
                    <span
                      aria-hidden
                      className={`my-2 w-px ${active || prevActive ? 'bg-transparent' : 'bg-border'}`}
                    />
                  )}
                  <Link
                    to={v.to}
                    aria-current={active ? 'page' : undefined}
                    style={active ? { backgroundColor: '#232150' } : undefined}
                    className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-sm font-medium transition-colors ${
                      active
                        ? 'text-white'
                        : 'text-foreground hover:bg-muted-surface'
                    }`}
                  >
                    <span className="hidden sm:flex">{NAV_ICONS[v.key]}</span>
                    <span className="whitespace-nowrap">{v.label}</span>
                  </Link>
                </Fragment>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
