import { useState } from 'react'
import { Button } from './ui/Button'
import { useAuthStore } from '../store/auth'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { ServiceCall } from '../types/db'

/**
 * Copies a Hebrew call summary to the clipboard, ready to paste into
 * a WhatsApp / SMS message. Format:
 *   "היי, זה <author>, לגבי קריאה מספר <display_id> עבור רכב מספר <vehicle_number> (תיאור תקלה: <description>)"
 * Optional fragments are skipped when their source field is empty.
 */
export function CopyCallSummaryButton({ call }: { call: ServiceCall }) {
  const employee = useAuthStore((s) => s.employee)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!employee) return null

  function buildSummary() {
    const parts = [`היי, זה ${employee!.name}, לגבי קריאה מספר ${call.display_id}`]
    if (call.vehicle_number) parts.push(`עבור רכב מספר ${call.vehicle_number}`)
    if (call.description)    parts.push(`(תיאור תקלה: ${call.description})`)
    return parts.join(' ')
  }

  async function handleCopy() {
    const text = buildSummary()
    setError(null)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('הדפדפן לא איפשר העתקה — סמן וידנית')
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <ComponentBadge id={5014} />
      <Button variant="secondary" onClick={handleCopy}>
        {copied ? '✓ הועתק' : 'העתק תקציר'}
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  )
}
