import { Link } from 'react-router-dom'
import { useManagerOverview } from '../hooks/useManagerOverview'
import { AppHeader } from '../components/AppHeader'
import { OpenCallsCard } from '../components/OpenCallsCard'
import { TankReadinessCard } from '../components/TankReadinessCard'
import { ReleaseNoteFooter } from '../components/ReleaseNoteFooter'
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
  { to: '/manager/settings/vehicles',    label: 'ניהול כלים',     desc: 'הכלים והציוד שמטופלים במערכת' },
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
            <OpenCallsCard total={data.openCalls} breakdown={data.openCallsBreakdown} />

            <TankReadinessCard groupLabels={['פלוגה']} />
            <TankReadinessCard
              title="כשירות שאר הכלים"
              typeName="רכב"
              groupBy={['department', 'sub_department']}
              groupLabels={['מחלקה', 'תת מחלקה']}
              badgeId={3023}
              colWidths={['20%', '32%', '13%', '12%', '12%', '11%']}
            />

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

            <ReleaseNoteFooter />
          </>
        )}
      </main>
    </>
  )
}
