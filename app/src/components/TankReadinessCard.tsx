import { useTankReadiness } from '../hooks/useTankReadiness'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Badge } from './ui/Badge'
import { ComponentBadge } from '../feedback/ComponentBadge'

export function TankReadinessCard() {
  const { data, isLoading } = useTankReadiness()

  if (isLoading || !data) return null
  if (data.byCompany.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <ComponentBadge id={3019} />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">כשירות טנקים</h3>
          <span className="text-xs text-muted">
            סה״כ {data.totals.total} · {data.totals.healthy} תקינים · {data.totals.with_issues} עם תקלות · {data.totals.disabled} מושבתים
          </span>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted border-b border-border">
              <th className="text-start font-medium px-4 py-2">פלוגה</th>
              <th className="text-start font-medium px-4 py-2">סה״כ</th>
              <th className="text-start font-medium px-4 py-2">תקינים</th>
              <th className="text-start font-medium px-4 py-2">עם תקלות</th>
              <th className="text-start font-medium px-4 py-2">מושבתים</th>
            </tr>
          </thead>
          <tbody>
            {data.byCompany.map((g) => (
              <tr key={g.sub_department} className="border-b border-border last:border-0">
                <td className="px-4 py-2 font-medium text-foreground">{g.sub_department}</td>
                <td className="px-4 py-2 text-foreground">{g.total}</td>
                <td className="px-4 py-2">
                  {g.healthy === 0
                    ? <span className="text-muted">0</span>
                    : <Badge tone="success">{g.healthy}</Badge>}
                </td>
                <td className="px-4 py-2">
                  {g.with_issues === 0
                    ? <span className="text-muted">0</span>
                    : <Badge tone="warning">{g.with_issues}</Badge>}
                </td>
                <td className="px-4 py-2">
                  {g.disabled === 0
                    ? <span className="text-muted">0</span>
                    : <Badge tone="danger">{g.disabled}</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  )
}
