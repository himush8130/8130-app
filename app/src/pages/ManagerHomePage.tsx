import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '../components/AppHeader'
import { ReleaseNoteFooter } from '../components/ReleaseNoteFooter'
import { AttendanceReportButton } from '../components/AttendanceReportButton'
import { ExportOpenCallsButton } from '../components/ExportOpenCallsButton'
import { TankMaintenanceOverview } from '../components/TankMaintenanceOverview'
import { ClassOrdersTable } from '../components/ClassOrdersTable'
import { Card, CardBody } from '../components/ui/Card'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { useAppSettings } from '../hooks/useAppSettings'
import { useAuthStore } from '../store/auth'
import { useParts } from '../hooks/useParts'
import { setAppSetting } from '../lib/adminActions'

const HIDDEN_TOP_PARTS_KEY = 'hidden_top_parts'

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

function HiddenPartsManager() {
  const { data: settings } = useAppSettings()
  const { data: parts } = useParts()
  const employee = useAuthStore((s) => s.employee)
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)

  const hiddenSkus: string[] = useMemo(() => {
    if (!settings?.[HIDDEN_TOP_PARTS_KEY]) return []
    try { return JSON.parse(settings[HIDDEN_TOP_PARTS_KEY]) } catch { return [] }
  }, [settings])

  const hiddenParts = useMemo(() => {
    if (!parts || hiddenSkus.length === 0) return []
    const catalog = new Map(parts.map(p => [p.sku, p.name]))
    return hiddenSkus.map(sku => ({ sku, name: catalog.get(sku) ?? sku }))
  }, [hiddenSkus, parts])

  const handleUnhide = useCallback(async (sku: string) => {
    if (!employee) return
    setBusy(sku)
    const next = hiddenSkus.filter(s => s !== sku)
    await setAppSetting(employee.employee_number, HIDDEN_TOP_PARTS_KEY, JSON.stringify(next))
    queryClient.invalidateQueries({ queryKey: ['app_settings'] })
    setBusy(null)
  }, [employee, hiddenSkus, queryClient])

  if (hiddenParts.length === 0) return null

  return (
    <Card>
      <CardBody>
        <h3 className="text-sm font-semibold text-foreground mb-3">פריטים מוסתרים מ״שימוש גבוה״</h3>
        <table className="w-full text-xs">
          <thead className="bg-muted-surface text-muted">
            <tr>
              <th className="text-start px-3 py-2">מק״ט</th>
              <th className="text-start px-3 py-2">שם</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {hiddenParts.map(p => (
              <tr key={p.sku} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-foreground">{p.sku}</td>
                <td className="px-3 py-2 text-foreground">{p.name}</td>
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    disabled={busy === p.sku}
                    onClick={() => handleUnhide(p.sku)}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    {busy === p.sku ? '...' : 'הצג'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  )
}

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
              <CardBody className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">ייצוא קריאות פתוחות</h3>
                <ExportOpenCallsButton />
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

            <HiddenPartsManager />

        <ReleaseNoteFooter />
      </main>
    </>
  )
}
