import type { Employee } from '../types/db'

/** Today's date in DD.MM (Israeli order). */
function todayDDMM(d: Date = new Date()): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}`
}

/** Today's local date as YYYY-MM-DD (matches the storage format in employee_availability). */
export function todayIsoLocal(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Build the daily attendance copy text:
 *   *חימוש 10.05*
 *   <name> - נוכח | בבית
 *
 * Order: by profession_name (alphabetical, no-profession last), then by name.
 * Excludes employees flagged exclude_from_availability_report.
 */
export function buildAttendanceText(
  employees: Employee[],
  unavailableTodayNumbers: Set<number>,
  now: Date = new Date(),
): string {
  const visible = employees.filter((e) => !e.exclude_from_availability_report)

  const sorted = [...visible].sort((a, b) => {
    const pa = a.profession_name ?? ''
    const pb = b.profession_name ?? ''
    if (pa === '' && pb !== '') return 1
    if (pb === '' && pa !== '') return -1
    if (pa !== pb) return pa.localeCompare(pb, 'he')
    return a.name.localeCompare(b.name, 'he')
  })

  const lines = sorted.map((e) => {
    const status = unavailableTodayNumbers.has(e.employee_number) ? 'בבית' : 'נוכח'
    return `${e.name} - ${status}`
  })

  return [`*חימוש ${todayDDMM(now)}*`, ...lines].join('\n')
}
