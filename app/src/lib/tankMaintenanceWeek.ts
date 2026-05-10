/** Week math for tank monthly/weekly maintenance.
 *  Weeks anchor to Sunday (Israeli convention) and are referenced by their
 *  Sunday date as YYYY-MM-DD. */

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Returns the Sunday of the week containing `d` (local time, midnight). */
export function weekStartSunday(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  out.setDate(out.getDate() - out.getDay()) // getDay: 0=Sun
  return out
}

/** ISO date of the Sunday that starts `d`'s week. */
export function weekStartIso(d: Date): string {
  return isoLocal(weekStartSunday(d))
}

/** ISO date of the Sunday of the week N weeks after `d`'s week. */
export function addWeeksIso(d: Date, weeks: number): string {
  const s = weekStartSunday(d)
  s.setDate(s.getDate() + weeks * 7)
  return isoLocal(s)
}

/** All Sunday-anchored weeks in a forward window (default 26 weeks ≈ 6 months). */
export function generateWeeks(from: Date, count: number): Date[] {
  const start = weekStartSunday(from)
  const out: Date[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i * 7)
    out.push(d)
  }
  return out
}
