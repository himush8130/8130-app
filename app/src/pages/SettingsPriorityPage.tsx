import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { useAppSettings } from '../hooks/useAppSettings'
import { useDashboardData } from '../hooks/useDashboardData'
import {
  parseWeights, parseImportance, priorityScore, DEFAULT_IMPORTANCE, MAX_IMPORTANCE,
  PRIORITY_WEIGHT_KEY, PRIORITY_IMPORTANCE_KEY, type PriorityWeights,
} from '../hooks/usePriorityConfig'
import { setAppSetting } from '../lib/adminActions'
import { AppHeader } from '../components/AppHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

const WEIGHT_FIELDS: { key: keyof PriorityWeights; label: string; hint: string }[] = [
  { key: 'disabling',     label: 'משביתות',            hint: 'אחוז הטנקים המושבתים בפלוגה' },
  { key: 'openCalls',     label: 'קריאות פתוחות',       hint: 'קריאות פתוחות לכל טנק, יחסית לפלוגה הגבוהה' },
  { key: 'importance',    label: 'חשיבות מבצעית',       hint: 'דירוג ידני 1–5 לכל פלוגה (מטה)' },
  { key: 'closeRate',     label: 'קצב סגירה (שבועיים)',  hint: 'ככל שנסגרו פחות קריאות ב-14 יום — ציון גבוה יותר' },
  { key: 'receivedParts', label: 'חלקים שהתקבלו',       hint: 'קריאות עם חלקים בסטטוס "התקבל", יחסית לפלוגה הגבוהה' },
]

export function SettingsPriorityPage() {
  const employee = useAuthStore((s) => s.employee)!
  const queryClient = useQueryClient()
  const { data: settings } = useAppSettings()
  const { data: dashboard } = useDashboardData()

  const [weights, setWeights] = useState<PriorityWeights>(() => parseWeights(undefined))
  const [importance, setImportance] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setWeights(parseWeights(settings[PRIORITY_WEIGHT_KEY]))
      setImportance(parseImportance(settings[PRIORITY_IMPORTANCE_KEY]))
    }
  }, [settings])

  const companies = dashboard?.companies ?? []
  const sum = WEIGHT_FIELDS.reduce((s, f) => s + (weights[f.key] || 0), 0)

  function setWeight(key: keyof PriorityWeights, v: string) {
    setWeights(w => ({ ...w, [key]: v === '' ? 0 : Math.max(0, parseInt(v, 10) || 0) }))
  }
  function setRating(label: string, v: string) {
    const n = v === '' ? DEFAULT_IMPORTANCE : Math.min(MAX_IMPORTANCE, Math.max(1, parseInt(v, 10) || DEFAULT_IMPORTANCE))
    setImportance(m => ({ ...m, [label]: n }))
  }

  async function save() {
    setBusy(true); setError(null); setSaved(false)
    try {
      let res = await setAppSetting(employee.employee_number, PRIORITY_WEIGHT_KEY, JSON.stringify(weights))
      if (!res.ok) throw new Error(res.error || 'שגיאה')
      res = await setAppSetting(employee.employee_number, PRIORITY_IMPORTANCE_KEY, JSON.stringify(importance))
      if (!res.ok) throw new Error(res.error || 'שגיאה')
      queryClient.invalidateQueries({ queryKey: ['app_settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AppHeader subtitle="הגדרות · תיעדוף פלוגה" />
      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-3 pb-24">
        <Link to="/manager" className="text-sm text-primary self-start">→ חזור לפאנל</Link>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">חלוקת משקלים</h3>
            <p className="text-xs text-muted mt-1">
              לכל פרמטר משקל. סך המשקלים אמור להיות 100. הפלוגה עם הציון המשוקלל הגבוה ביותר תוצג כפלוגה לתיעדוף.
            </p>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {WEIGHT_FIELDS.map(f => (
              <Input
                key={f.key}
                label={f.label}
                hint={f.hint}
                name={`w_${f.key}`}
                type="number"
                value={String(weights[f.key] ?? 0)}
                onChange={(e) => setWeight(f.key, e.target.value)}
              />
            ))}
            <div className={`text-sm font-medium ${sum === 100 ? 'text-success' : 'text-warning'}`}>
              סך המשקלים: {sum} {sum !== 100 && '(מומלץ 100)'}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">חשיבות מבצעית לכל פלוגה</h3>
            <p className="text-xs text-muted mt-1">דירוג 1–5 (ברירת מחדל 1). 5 = הקריטית ביותר מבצעית.</p>
          </CardHeader>
          <CardBody>
            {companies.length === 0 ? (
              <p className="text-sm text-muted">טוען פלוגות…</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {companies.map(c => (
                  <div key={c.label} className="flex flex-col gap-1 items-center">
                    <label className="text-xs font-medium text-foreground">{c.label}</label>
                    <select
                      value={String(importance[c.label] ?? DEFAULT_IMPORTANCE)}
                      onChange={(e) => setRating(c.label, e.target.value)}
                      className="w-14 text-center px-1 py-1.5 bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {[1, 2, 3, 4, 5].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {companies.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-foreground">פירוט ציון לכל פלוגה</h3>
              <p className="text-xs text-muted mt-1">הציון המשוקלל מחושב לפי המשקלים שלמעלה. ציון גולמי = ערך הפרמטר (0–1), תרומה = גולמי × משקל.</p>
            </CardHeader>
            <CardBody className="flex flex-col gap-4 p-0">
              {companies
                .map(c => ({
                  company: c,
                  total: priorityScore(c, weights, importance[c.label] ?? DEFAULT_IMPORTANCE),
                }))
                .sort((a, b) => b.total - a.total)
                .map(({ company: c, total }) => {
                  const impRating = importance[c.label] ?? DEFAULT_IMPORTANCE
                  const impScore = Math.min(impRating, MAX_IMPORTANCE) / MAX_IMPORTANCE
                  const params = [
                    { label: 'משביתות',           raw: c.scoreDisabling, w: weights.disabling },
                    { label: 'קריאות פתוחות',      raw: c.scoreOpenCalls, w: weights.openCalls },
                    { label: 'חשיבות מבצעית',      raw: impScore,         w: weights.importance },
                    { label: 'קצב סגירה',          raw: c.scoreCloseRate, w: weights.closeRate },
                    { label: 'חלקים שהתקבלו',      raw: c.scoreReceived,  w: weights.receivedParts },
                  ]
                  return (
                    <div key={c.label} className="border-b border-border last:border-0">
                      <div className="flex items-center justify-between px-4 py-3 bg-muted-surface">
                        <span className="text-sm font-semibold text-foreground">{c.label}</span>
                        <span className="text-sm font-bold text-foreground">{total}</span>
                      </div>
                      <table className="w-full text-xs">
                        <thead className="text-muted">
                          <tr>
                            <th className="text-start px-4 py-1.5">פרמטר</th>
                            <th className="text-start px-3 py-1.5">גולמי</th>
                            <th className="text-start px-3 py-1.5">משקל</th>
                            <th className="text-start px-3 py-1.5">תרומה</th>
                          </tr>
                        </thead>
                        <tbody>
                          {params.map(p => (
                            <tr key={p.label} className="border-t border-border">
                              <td className="px-4 py-1.5 text-foreground">{p.label}</td>
                              <td className="px-3 py-1.5 font-mono text-muted">{p.raw.toFixed(2)}</td>
                              <td className="px-3 py-1.5 font-mono text-muted">{p.w}</td>
                              <td className="px-3 py-1.5 font-mono font-medium text-foreground">{(p.raw * p.w).toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
            </CardBody>
          </Card>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={busy}>{busy ? 'שומר…' : 'שמור'}</Button>
          {saved && <span className="text-sm text-success">נשמר ✓</span>}
          {error && <span className="text-sm text-danger">{error}</span>}
        </div>
      </main>
    </>
  )
}
