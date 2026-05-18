import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useFeedbackMode } from '../store/feedbackMode'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { hardReload } from '../lib/hardReload'

const MANAGER_VIEWS: Array<{ to: string; label: string; matches: (p: string) => boolean }> = [
  { to: '/manager',          label: 'מנהל',          matches: (p) => p.startsWith('/manager') && !p.startsWith('/manager/vehicles') },
  { to: '/manager/vehicles', label: 'ספר רק״ם/כלי',  matches: (p) => p.startsWith('/manager/vehicles') },
  { to: '/warehouse',        label: 'מחסנאי',        matches: (p) => p.startsWith('/warehouse') },
  { to: '/technician',       label: 'טכנאי',         matches: (p) => p.startsWith('/technician') },
]

// Shared button styling so every chip in the header row (יציאה,
// refresh, notes, feedback toggle) is the same height and has the
// same border + radius.
const CHIP_BASE = 'h-7 inline-flex items-center justify-center rounded-md border text-xs font-medium transition-colors disabled:opacity-50'
const CHIP_NEUTRAL = 'bg-card text-muted hover:text-foreground border-border hover:bg-muted-surface'
const CHIP_ICON = 'w-7'

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const employee = useAuthStore((s) => s.employee)
  const logout = useAuthStore((s) => s.logout)
  const feedbackEnabled = useFeedbackMode((s) => s.enabled)
  const toggleFeedback = useFeedbackMode((s) => s.toggle)
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

  const isManager = employee?.permissions === 'manager'

  return (
    <header className="bg-card border-b border-border">
      <ComponentBadge id={1001} />

      {/* Row 1: title (right) + uniform chip row (left). RTL reading
          order in the JSX below is right→left visually:
          [name] [🔧] [📝 notes] [⟳ refresh] [יציאה] */}
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground">8130 APP</h1>
          {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
        </div>

        {employee && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted hidden sm:inline">{employee.name}</span>

            <span className="inline-flex items-center">
              <ComponentBadge id={1003} />
              <button
                type="button"
                onClick={toggleFeedback}
                title="הצג/הסתר תגי קומפוננטה ושדה הערות"
                aria-pressed={feedbackEnabled}
                className={`${CHIP_BASE} ${
                  feedbackEnabled
                    ? 'bg-primary text-primary-fg border-primary'
                    : CHIP_NEUTRAL
                } ${feedbackEnabled ? 'px-2' : CHIP_ICON}`}
              >
                {feedbackEnabled ? '🔧 מצב הערות' : '🔧'}
              </button>
            </span>

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
                className={`${CHIP_BASE} ${CHIP_NEUTRAL} ${CHIP_ICON} text-base`}
              >
                ⟳
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

      {/* Row 2: manager view switcher only (לוג הערות moved up as icon). */}
      {isManager && (
        <div className="max-w-3xl mx-auto px-4 pb-2 flex items-center gap-1 flex-wrap">
          <ComponentBadge id={3020} />
          <span className="text-xs text-muted ms-1">תצוגה:</span>
          {MANAGER_VIEWS.map((v) => {
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
