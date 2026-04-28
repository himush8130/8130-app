import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { Button } from './ui/Button'

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const employee = useAuthStore((s) => s.employee)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">8130 APP</h1>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {employee && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">{employee.name}</span>
            <Button variant="ghost" onClick={handleLogout}>יציאה</Button>
          </div>
        )}
      </div>
    </header>
  )
}
