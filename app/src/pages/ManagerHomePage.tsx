import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { ReleaseNoteFooter } from '../components/ReleaseNoteFooter'
import { AttendanceReportButton } from '../components/AttendanceReportButton'
import { TankMaintenanceOverview } from '../components/TankMaintenanceOverview'
import { ClassOrdersTable } from '../components/ClassOrdersTable'
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
  { to: '/manager/settings/copy-format', label: 'פורמט העתקה',         desc: 'תוויות קבועות + חטיבה/גדוד שמופיעים בהעתקה מהירה' },
  { to: '/manager/settings/priority',    label: 'תיעדוף פלוגה',        desc: 'חלוקת משקלים לחישוב הפלוגה לתיעדוף + חשיבות מבצעית' },
]

export function ManagerHomePage() {
  return (
    <>
      <AppHeader subtitle="פאנל מנהל" />

      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
        <ComponentBadge id={3001} />
        {/* קריאות פתוחות, טבלאות כשירות וטבלת שעות מנוע הועברו ללוח
            הבקרה החדש כדי למנוע כפילות. */}
        <ClassOrdersTable />

            <TankMaintenanceOverview />

            <Card>
              <CardBody className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">דוח נוכחות יומי</h3>
                <AttendanceReportButton />
              </CardBody>
            </Card>

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
      </main>
    </>
  )
}
