import { useTankReadiness, type CompanyReadiness } from '../hooks/useTankReadiness'
import { Card, CardBody, CardHeader } from './ui/Card'
import { DonutChart } from './DonutChart'
import { ComponentBadge } from '../feedback/ComponentBadge'

const COLOR_HEALTHY  = 'var(--color-success)'
const COLOR_ISSUES   = 'var(--color-warning)'
const COLOR_DISABLED = 'var(--color-danger)'

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
      <CardBody>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {data.byCompany.map((g) => <CompanyDonut key={g.sub_department} g={g} />)}
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 flex-wrap text-xs">
          <Legend color={COLOR_HEALTHY}  label="תקין" />
          <Legend color={COLOR_ISSUES}   label="עם תקלה" />
          <Legend color={COLOR_DISABLED} label="מושבת" />
        </div>
      </CardBody>
    </Card>
  )
}

function CompanyDonut({ g }: { g: CompanyReadiness }) {
  const segments = [
    { value: g.healthy,     color: COLOR_HEALTHY,  label: 'תקין' },
    { value: g.with_issues, color: COLOR_ISSUES,   label: 'עם תקלה' },
    { value: g.disabled,    color: COLOR_DISABLED, label: 'מושבת' },
  ]
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-sm font-semibold text-foreground">פלוגה {g.sub_department}</div>
      <DonutChart
        segments={segments}
        size={140}
        thickness={18}
        centerLabel={g.total}
        centerSubLabel="סה״כ"
      />
      <div className="flex items-center justify-center gap-3 text-xs text-muted">
        <span><span className="text-success font-medium">{g.healthy}</span> תקין</span>
        <span><span className="text-warning font-medium">{g.with_issues}</span> תקלה</span>
        <span><span className="text-danger font-medium">{g.disabled}</span> מושבת</span>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <span className="w-3 h-3 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </span>
  )
}
