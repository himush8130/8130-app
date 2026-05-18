import { useTankMaintenanceOverview } from '../hooks/useTankMaintenance'
import { CollapsibleSection } from './CollapsibleSection'
import { Badge } from './ui/Badge'

/** "1-7/5" — Sunday-anchored week range for a header cell. */
function formatWeekRange(weekStartIso: string): string {
  const [y, m, d] = weekStartIso.split('-').map((s) => parseInt(s, 10))
  const start = new Date(y, m - 1, d)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  // If the week spans two months, show both: "29/4-5/5".
  if (start.getMonth() !== end.getMonth()) {
    return `${start.getDate()}/${start.getMonth() + 1}-${end.getDate()}/${end.getMonth() + 1}`
  }
  return `${start.getDate()}-${end.getDate()}/${end.getMonth() + 1}`
}

/** Manager-home table: per-tank weekly/monthly status this week + next. */
export function TankMaintenanceOverview() {
  const { rows, isLoading, thisWeekIso, nextWeekIso } = useTankMaintenanceOverview()
  const thisRange = formatWeekRange(thisWeekIso)
  const nextRange = formatWeekRange(nextWeekIso)

  return (
    <CollapsibleSection
      title="טיפול שבועי / חודשי"
      count={rows.length}
      badgeId={3031}
    >
      {isLoading ? (
        <p className="text-sm text-muted text-center py-4">טוען...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">אין טנקים</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted-surface text-xs text-muted">
              <tr>
                <th className="text-start px-3 py-2">צ׳ / פלוגה</th>
                <th className="text-start px-3 py-2">
                  <div>השבוע</div>
                  <div className="font-normal text-[11px] opacity-80">{thisRange}</div>
                </th>
                <th className="text-start px-3 py-2">
                  <div>שבוע הבא</div>
                  <div className="font-normal text-[11px] opacity-80">{nextRange}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.vehicle_number} className="border-t border-border">
                  <td className="px-3 py-2">
                    <span className="font-mono">{r.vehicle_number}</span>
                    {r.sub_department && <span className="text-xs text-muted"> · {r.sub_department}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={r.thisWeek === 'חודשי' ? 'warning' : 'success'}>{r.thisWeek}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={r.nextWeek === 'חודשי' ? 'warning' : 'success'}>{r.nextWeek}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CollapsibleSection>
  )
}
