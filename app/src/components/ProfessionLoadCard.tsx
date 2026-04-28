import { Card, CardBody, CardHeader } from './ui/Card'
import { Badge } from './ui/Badge'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { ProfessionLoad } from '../hooks/useManagerReports'

export function ProfessionLoadCard({ rows }: { rows: ProfessionLoad[] }) {
  return (
    <Card>
      <CardHeader>
        <ComponentBadge id={3005} />
        <h3 className="text-sm font-semibold text-foreground">עומס לפי מקצוע</h3>
      </CardHeader>
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">אין נתונים</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted border-b border-border">
                <th className="text-start font-medium px-4 py-2">מקצוע</th>
                <th className="text-start font-medium px-4 py-2">קריאות פעילות</th>
                <th className="text-start font-medium px-4 py-2">ממתינות לחלקים</th>
                <th className="text-start font-medium px-4 py-2">טכנאים</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const noTechs    = r.profession_id !== null && r.technician_count === 0
                const heavyLoad  = r.technician_count > 0 && r.open_total / r.technician_count >= 5
                return (
                  <tr
                    key={r.profession_id ?? 'unclassified'}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-2 text-foreground">{r.profession_name}</td>
                    <td className="px-4 py-2">
                      {heavyLoad
                        ? <Badge tone="warning">{r.open_total}</Badge>
                        : <span className="text-foreground">{r.open_total}</span>}
                    </td>
                    <td className="px-4 py-2 text-muted">{r.waiting_for_parts}</td>
                    <td className="px-4 py-2">
                      {noTechs
                        ? <Badge tone="danger">0</Badge>
                        : <span className="text-foreground">{r.technician_count}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </CardBody>
    </Card>
  )
}
