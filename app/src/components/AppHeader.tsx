import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { hardReload } from '../lib/hardReload'
import { BUILD_TIME } from '../releaseNotes'

type ViewKey = 'manager' | 'vehicles' | 'warehouse' | 'technician'

const ALL_VIEWS: Array<{ key: ViewKey; to: string; label: string; matches: (p: string) => boolean }> = [
  { key: 'manager',    to: '/manager',          label: 'מנהל',          matches: (p) => p.startsWith('/manager') && !p.startsWith('/manager/vehicles') },
  { key: 'vehicles',   to: '/manager/vehicles', label: 'ספר רק״ם/כלי',  matches: (p) => p.startsWith('/manager/vehicles') },
  { key: 'warehouse',  to: '/warehouse',        label: 'מחסנאי',        matches: (p) => p.startsWith('/warehouse') },
  { key: 'technician', to: '/technician',       label: 'טכנאי',         matches: (p) => p.startsWith('/technician') },
]

const VIEWS_BY_ROLE: Record<'manager' | 'warehouse' | 'technician', ViewKey[]> = {
  manager:    ['manager', 'vehicles', 'warehouse', 'technician'],
  warehouse:  ['warehouse', 'vehicles'],
  technician: ['vehicles', 'technician'],
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

            <span className="inline-flex items-center">
              <ComponentBadge id={1004} />
              <Link
                to="/notes"
                aria-label="לוג הערות"
                title="לוג הערות"
                className={`${CHIP_BASE} ${CHIP_NEUTRAL} ${CHIP_ICON} text-base`}
              >
                📝
              </Link>
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
