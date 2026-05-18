import { useMemo } from 'react'
import { useVehicles } from '../hooks/useVehicles'
import { CollapsibleSection } from './CollapsibleSection'
import type { Vehicle } from '../types/db'

const THRESHOLD_OFFSET = 200
const NEAR_BAND = 50

/** Colour rule for the engine-hours cell:
 *   value > threshold              → red
 *   threshold - 50 ≤ value ≤ threshold → yellow
 *   value < threshold - 50         → green
 *  Missing data falls back to a neutral muted style.
 */
function engineHoursTone(value: number | null, threshold: number | null): string {
  if (value == null || threshold == null) return 'text-muted'
  if (value > threshold)                  return 'text-danger font-semibold'
  if (value >= threshold - NEAR_BAND)     return 'text-warning font-semibold'
  return 'text-success font-medium'
}

export function TankReadingsTable() {
  const { data: vehicles, isLoading } = useVehicles()

  const tanks = useMemo<Vehicle[]>(
    () => (vehicles ?? [])
      .filter((v) => v.type_name === 'טנק')
      .sort((a, b) => a.vehicle_number.localeCompare(b.vehicle_number)),
    [vehicles],
  )

  return (
    <CollapsibleSection
      title="שעות מנוע / קילומטר"
      count={tanks.length}
      badgeId={3033}
    >
      {isLoading ? (
        <p className="text-sm text-muted text-center py-4">טוען...</p>
      ) : tanks.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">אין טנקים</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-muted-surface text-xs text-muted">
            <tr>
              <th className="text-start px-3 py-2 w-1/4">צ׳ טנק</th>
              <th className="text-start px-3 py-2 w-1/4">שעות מנוע</th>
              <th className="text-start px-3 py-2 w-1/4">סף</th>
              <th className="text-start px-3 py-2 w-1/4">קילומטר</th>
            </tr>
          </thead>
          <tbody>
            {tanks.map((t) => {
              const threshold = t.initial_engine_hours != null ? t.initial_engine_hours + THRESHOLD_OFFSET : null
              const tone = engineHoursTone(t.current_engine_hours ?? null, threshold)
              return (
                <tr key={t.vehicle_number} className="border-t border-border">
                  <td className="px-3 py-2 font-mono">
                    {t.vehicle_number}
                    {t.sub_department && <span className="text-xs text-muted"> · {t.sub_department}</span>}
                  </td>
                  <td className={`px-3 py-2 font-mono ${tone}`}>{t.current_engine_hours ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-muted">{threshold ?? '—'}</td>
                  <td className="px-3 py-2 font-mono">{t.current_kilometers ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </CollapsibleSection>
  )
}
