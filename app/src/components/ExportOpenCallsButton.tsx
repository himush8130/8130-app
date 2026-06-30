import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/Button'
import type { ServiceCall, CallStatus } from '../types/db'

const OPEN_STATUSES: CallStatus[] = ['new', 'in_treatment', 'waiting_for_parts']

const STATUS_HEBREW: Record<string, string> = {
  new: 'חדשה',
  in_treatment: 'בטיפול',
  waiting_for_parts: 'ממתינה לחלקים',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function callBlock(c: ServiceCall): string {
  const lines = [`קריאה מספר ${c.display_id}`]
  if (c.vehicle_number) lines.push(`עבור כלי מספר ${c.vehicle_number}`)
  const detail: string[] = []
  if (c.description) detail.push(`תיאור תקלה: ${c.description}`)
  if (c.is_disabling) detail.push('משביתה')
  if (c.profession_name) detail.push(`מקצוע: ${c.profession_name}`)
  if (c.reporter_name) detail.push(`דיווח: ${c.reporter_name}`)
  detail.push(`נפתחה: ${fmtDate(c.created_at)}`)
  lines.push(detail.join(' · '))
  lines.push('─'.repeat(30))
  return lines.join('\n')
}

export function ExportOpenCallsButton() {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('service_calls')
        .select('*')
        .in('status', OPEN_STATUSES)
        .order('created_at', { ascending: false })

      if (error) throw error
      const calls = (data ?? []) as ServiceCall[]

      if (calls.length === 0) {
        alert('אין קריאות פתוחות')
        setLoading(false)
        return
      }

      const grouped = new Map<CallStatus, ServiceCall[]>()
      for (const s of OPEN_STATUSES) grouped.set(s, [])
      for (const c of calls) grouped.get(c.status)?.push(c)

      const lines: string[] = [
        `דוח קריאות פתוחות — ${fmtDate(new Date().toISOString())}`,
        `סה״כ: ${calls.length} קריאות`,
        '═'.repeat(50),
      ]

      for (const status of OPEN_STATUSES) {
        const group = grouped.get(status) ?? []
        if (group.length === 0) continue
        lines.push('', `▸ ${STATUS_HEBREW[status]} (${group.length})`, '─'.repeat(40))
        for (const c of group) lines.push(callBlock(c))
      }

      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `קריאות_פתוחות_${new Date().toISOString().slice(0, 10)}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('שגיאה בייצוא')
    }
    setLoading(false)
  }

  return (
    <Button variant="secondary" onClick={handleExport} disabled={loading}>
      {loading ? 'מייצא...' : 'ייצוא קריאות פתוחות'}
    </Button>
  )
}
