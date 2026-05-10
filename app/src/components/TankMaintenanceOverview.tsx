import { useTankMaintenanceOverview } from '../hooks/useTankMaintenance'
import { CollapsibleSection } from './CollapsibleSection'
import { Badge } from './ui/Badge'

/** Manager-home table: per-tank weekly/monthly status this week + next. */
export function TankMaintenanceOverview() {
  const { rows, isLoading } = useTankMaintenanceOverview()

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
                <th className="text-start px-3 py-2">השבוע</th>
                <th className="text-start px-3 py-2">שבוע הבא</th>
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
