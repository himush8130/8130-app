import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useFeedbackMode } from '../store/feedbackMode'
import { Button } from './ui/Button'
import { ComponentBadge } from '../feedback/ComponentBadge'

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const employee = useAuthStore((s) => s.employee)
  const logout = useAuthStore((s) => s.logout)
  const feedbackEnabled = useFeedbackMode((s) => s.enabled)
  const toggleFeedback = useFeedbackMode((s) => s.toggle)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="bg-card border-b border-border">
      <ComponentBadge id={1001} />
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-foreground">8130 APP</h1>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {employee && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted hidden sm:inline">{employee.name}</span>

            <button
              type="button"
              onClick={toggleFeedback}
              title="הצג/הסתר תגי קומפוננטה ושדה הערות"
              className={`relative inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                feedbackEnabled
                  ? 'bg-primary text-primary-fg border-primary'
                  : 'bg-card text-muted border-border hover:bg-muted-surface'
              }`}
            >
              <ComponentBadge id={1003} />
              {feedbackEnabled ? '🔧 מצב הערות' : '🔧'}
            </button>

            <Link
              to="/notes"
              className="text-xs text-muted hover:text-foreground border border-border rounded-md px-2 py-1 inline-flex items-center"
            >
              <ComponentBadge id={1004} />
              לוג הערות
            </Link>

            <Button variant="ghost" onClick={handleLogout}>
              <ComponentBadge id={1002} />
              יציאה
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
