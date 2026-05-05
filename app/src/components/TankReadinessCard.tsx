import { useTankReadiness, type CompanyReadiness } from '../hooks/useTankReadiness'
import { Card, CardBody, CardHeader } from './ui/Card'
import { ComponentBadge } from '../feedback/ComponentBadge'

interface Props {
  title?:       string
  typeName?:    string
  groupBy?:     string | string[]
  groupLabels?: string[]   // one header label per group column
  badgeId?:     number
}

export function TankReadinessCard({
  title       = 'כשירות טנקים',
  typeName    = 'טנק',
  groupBy     = 'sub_department',
  groupLabels = ['פלוגה'],
  badgeId     = 3019,
}: Props = {}) {
  const cols = Array.isArray(groupBy) ? groupBy : [groupBy]
  const { data, isLoading } = useTankReadiness(typeName, cols)
  if (isLoading || !data || data.byCompany.length === 0) return null

  const totalOperational = data.totals.healthy + data.totals.with_issues
  const totalReadiness   = pct(totalOperational, data.totals.total)

  return (
    <Card>
      <CardHeader>
        <ComponentBadge id={badgeId} />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-xs text-muted">
            סה״כ {data.totals.total} כלים · אחוז כשירות כללי{' '}
            <strong className={tone(totalReadiness)}>{totalReadiness}%</strong>
          </span>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted border-b border-border">
              {groupLabels.map((label) => (
                <th key={label} className="text-start font-medium px-4 py-2">{label}</th>
              ))}
              <th className="text-start font-medium px-4 py-2">סה״כ</th>
              <th className="text-start font-medium px-4 py-2">תקין</th>
              <th className="text-start font-medium px-4 py-2">מושבת</th>
              <th className="text-start font-medium px-4 py-2">אחוז כשירות</th>
            </tr>
          </thead>
          <tbody>
            {data.byCompany.map((g) => <CompanyRow key={g.key} g={g} />)}
          </tbody>
        </table>
      </CardBody>
    </Card>
  )
}

function CompanyRow({ g }: { g: CompanyReadiness }) {
  const operational = g.healthy + g.with_issues
  const p = pct(operational, g.total)
  return (
    <tr className="border-b border-border last:border-0">
      {g.groupValues.map((v, i) => (
        <td key={i} className="px-4 py-2 font-medium text-foreground">{v}</td>
      ))}
      <td className="px-4 py-2 text-foreground">{g.total}</td>
      <td className="px-4 py-2 text-success font-medium">{operational}</td>
      <td className="px-4 py-2 text-danger font-medium">{g.disabled}</td>
      <td className={`px-4 py-2 font-semibold ${tone(p)}`}>{p}%</td>
    </tr>
  )
}

function pct(numerator: number, total: number): number {
  return total === 0 ? 0 : Math.round((numerator / total) * 100)
}

function tone(p: number): string {
  if (p >= 80) return 'text-success'
  if (p >= 50) return 'text-warning'
  return 'text-danger'
}
