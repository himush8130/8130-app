import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useFeedbackNotes } from '../hooks/useFeedbackNotes'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { hardReload } from '../lib/hardReload'
import { BUILD_TIME } from '../releaseNotes'

type ViewKey = 'manager' | 'vehicles' | 'warehouse' | 'technician' | 'technician_new'

const ALL_VIEWS: Array<{ key: ViewKey; to: string; label: string; matches: (p: string) => boolean }> = [
  { key: 'manager',        to: '/manager',                 label: 'מנהל',           matches: (p) => p.startsWith('/manager') && !p.startsWith('/manager/vehicles') },
  { key: 'vehicles',       to: '/manager/vehicles',        label: 'ספר רק״ם/כלי',   matches: (p) => p.startsWith('/manager/vehicles') },
  { key: 'warehouse',      to: '/warehouse',               label: 'מחסנאי',         matches: (p) => p.startsWith('/warehouse') },
  { key: 'technician',     to: '/technician',              label: 'טכנאי',          matches: (p) => p === '/technician' || (p.startsWith('/technician') && !p.startsWith('/technician/by-company')) },
  { key: 'technician_new', to: '/technician/by-company',   label: 'טכנאי - חדש',    matches: (p) => p.startsWith('/technician/by-company') },
]

const VIEWS_BY_ROLE: Record<'manager' | 'warehouse' | 'technician', ViewKey[]> = {
  manager:    ['manager', 'vehicles', 'warehouse', 'technician', 'technician_new'],
  warehouse:  ['warehouse', 'vehicles'],
  technician: ['vehicles', 'technician', 'technician_new'],
}

// Shared button styling so every chip in the header row (יציאה,
// refresh, notes, feedback toggle) is the same height and has the
// same border + radius.
const CHIP_BASE = 'h-7 inline-flex items-center justify-center rounded-md border text-xs font-medium transition-colors disabled:opacity-50'
const CHIP_NEUTRAL = 'bg-card text-muted hover:text-foreground border-border hover:bg-muted-surface'
const CHIP_ICON = 'w-7'

export function AppHeader({ subtitle }: { subtitle?: string }) {
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
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
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

      {/* Row 2: per-role view switcher. */}
      {roleViews.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 pb-2 flex items-center gap-1 flex-wrap">
          <ComponentBadge id={3020} />
          <span className="text-xs text-muted ms-1">תצוגה:</span>
          {roleViews.map((v) => {
            const active = v.matches(location.pathname)
            return (
              <Link
                key={v.to}
                to={v.to}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  active
                    ? 'bg-primary text-primary-fg border-primary'
                    : 'bg-card text-muted border-border hover:bg-muted-surface'
                }`}
              >
                {v.label}
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}
