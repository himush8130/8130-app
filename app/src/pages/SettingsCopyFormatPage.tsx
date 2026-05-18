import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { useAppSettings } from '../hooks/useAppSettings'
import { setAppSetting } from '../lib/adminActions'
import { AppHeader } from '../components/AppHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

interface Field {
  key:   string
  label: string
  /** Visual hint about what this controls. */
  hint?: string
}

// The label for each row. The VALUE rows (brigade/battalion) are the
// only ones whose value is itself a constant — the rest are just the
// display labels for the dynamic parts.
const FIELDS: Field[] = [
  { key: 'copy_brigade_label',   label: 'תווית "חטיבה"' },
  { key: 'copy_brigade_value',   label: 'ערך החטיבה (קבוע)', hint: 'יוצג אחרי "חטיבה:"' },
  { key: 'copy_battalion_label', label: 'תווית "גדוד"' },
  { key: 'copy_battalion_value', label: 'ערך הגדוד (קבוע)', hint: 'יוצג אחרי "גדוד:"' },
  { key: 'copy_kli_type_label',  label: 'תווית "סוג הכלי"' },
  { key: 'copy_kli_fit_label',   label: 'תווית "האם הכלי כשיר"' },
  { key: 'copy_kli_num_label',   label: 'תווית "צ׳"' },
  { key: 'copy_location_label',  label: 'תווית "מיקום"' },
  { key: 'copy_sku_label',       label: 'תווית "מק״ט"' },
  { key: 'copy_part_name_label', label: 'תווית "שם החלק"' },
  { key: 'copy_qty_label',       label: 'תווית "כמות"' },
  { key: 'copy_tsakah_value',    label: 'צק״ח של היחידה', hint: 'יוצג בפורמט "הזמנת כיתה" אחרי "צק״ח:"' },
]

export function SettingsCopyFormatPage() {
  const employee = useAuthStore((s) => s.employee)!
  const queryClient = useQueryClient()
  const { data: settings } = useAppSettings()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (settings) setDraft(settings)
  }, [settings])

  async function save() {
    setBusy(true); setError(null); setSaved(false)
    try {
      // Only push fields the user actually edited.
      for (const f of FIELDS) {
        const next = draft[f.key] ?? ''
        const cur  = settings?.[f.key] ?? ''
        if (next !== cur) {
          const res = await setAppSetting(employee.employee_number, f.key, next)
          if (!res.ok) throw new Error(res.error || 'שגיאה')
        }
      }
      queryClient.invalidateQueries({ queryKey: ['app_settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setError(e?.message || 'שגיאה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AppHeader subtitle="הגדרות · פורמט העתקה" />
      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-3 pb-24">
        <Link to="/manager" className="text-sm text-primary self-start">→ חזור לפאנל</Link>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">פורמט העתקה (פעולות פתוחות במחסן)</h3>
            <p className="text-xs text-muted mt-1">
              עורך את התוויות הקבועות ואת ערכי החטיבה/גדוד. ערכים דינמיים (סוג כלי, מק״ט, כמות וכו׳) נלקחים אוטומטית מהנתונים.
            </p>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {FIELDS.map((f) => (
              <Input
                key={f.key}
                label={f.label}
                hint={f.hint}
                name={f.key}
                value={draft[f.key] ?? ''}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
              />
            ))}
            <div className="flex gap-2 items-center">
              <Button onClick={save} disabled={busy}>{busy ? 'שומר...' : 'שמור'}</Button>
              {saved && <span className="text-xs text-success">✓ נשמר</span>}
              {error && <span className="text-xs text-danger">{error}</span>}
            </div>
          </CardBody>
        </Card>
      </main>
    </>
  )
}
