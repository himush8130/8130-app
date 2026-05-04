import { Link } from 'react-router-dom'
import { useManagerOverview } from '../hooks/useManagerOverview'
import { AppHeader } from '../components/AppHeader'
import { StatCard } from '../components/StatCard'
import { TankReadinessCard } from '../components/TankReadinessCard'
import { Card, CardBody } from '../components/ui/Card'
import { ComponentBadge } from '../feedback/ComponentBadge'

interface SettingsLink {
  to: string
  label: string
  desc: string
}

const SETTINGS_LINKS: SettingsLink[] = [
  { to: '/manager/settings/professions', label: 'ניהול מקצועות',  desc: 'הוספה / עריכה / מחיקה של רשימת המקצועות' },
  { to: '/manager/settings/employees',   label: 'ניהול עובדים',   desc: 'מספרי עובד, שמות, טלפונים, מקצוע, הרשאה' },
  { to: '/manager/settings/vehicles',    label: 'ניהול רכבים',    desc: 'הרכב והציוד שמטופלים במערכת' },
  { to: '/warehouse',                    label: 'ניהול חלקי חילוף', desc: 'קטלוג, חיפוש, עדכון כמויות וערכי שדה' },
  { to: '/manager/settings/availability',label: 'ניהול זמינות עובדים', desc: 'ימי חופש / מילואים / מחלה לכל עובד' },
]

export function ManagerHomePage() {
  const { data, isLoading } = useManagerOverview()

  return (
    <>
      <AppHeader subtitle="פאנל מנהל" />

      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
        <ComponentBadge id={3001} />
        {isLoading || !data ? (
          <p className="text-sm text-muted text-center py-8">טוען...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard
                badgeId={3002}
                label="קריאות פתוחות"
                value={data.openCalls}
                to="/manager/calls"
              />
              <StatCard
                badgeId={3003}
                label="חריגות דחופות"
                value={data.urgentAnomalies}
                tone={data.urgentAnomalies > 0 ? 'danger' : 'neutral'}
                to="/manager/anomalies"
              />
              <StatCard
                badgeId={3004}
                label="חלקים במלאי נמוך"
                value={data.lowStockParts}
                tone={data.lowStockParts > 0 ? 'danger' : 'neutral'}
                to="/warehouse?low_stock=1"
              />
            </div>

            <TankReadinessCard />

            <Card>
              <CardBody>
                <ComponentBadge id={3014} />
                <h3 className="text-sm font-semibold text-foreground mb-3">הגדרות וניהול נתונים</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {SETTINGS_LINKS.map((s) => (
                    <li key={s.to}>
                      <Link
                        to={s.to}
                        className="block px-3 py-2 rounded-md border border-border hover:bg-muted-surface"
                      >
                        <div className="text-primary font-medium">{s.label} →</div>
                        <div className="text-xs text-muted">{s.desc}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </>
        )}
      </main>
    </>
  )
}
