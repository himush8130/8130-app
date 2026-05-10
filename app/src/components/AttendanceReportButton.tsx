import { useState } from 'react'
import { Button } from './ui/Button'
import { useEmployees } from '../hooks/useEmployees'
import { useTodayUnavailable } from '../hooks/useTodayUnavailable'
import { buildAttendanceText } from '../lib/attendanceReport'
import { ComponentBadge } from '../feedback/ComponentBadge'

/** Manager-only: copy today's attendance report to clipboard. */
export function AttendanceReportButton() {
  const { data: employees } = useEmployees()
  const { data: unavail } = useTodayUnavailable()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready = !!employees && !!unavail

  async function handleCopy() {
    if (!ready) return
    setError(null)
    const text = buildAttendanceText(employees!, unavail!)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('הדפדפן לא איפשר העתקה')
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <ComponentBadge id={3030} />
      <Button variant="secondary" onClick={handleCopy} disabled={!ready}>
        {copied ? '✓ הועתק' : 'העתק דוח נוכחות'}
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  )
}
