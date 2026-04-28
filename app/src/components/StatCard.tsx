import { Link } from 'react-router-dom'
import { Card, CardBody } from './ui/Card'

interface StatCardProps {
  label: string
  value: number | string
  to?: string
  tone?: 'neutral' | 'danger' | 'warning'
}

const toneClasses: Record<NonNullable<StatCardProps['tone']>, string> = {
  neutral: 'text-foreground',
  danger:  'text-danger',
  warning: 'text-warning',
}

export function StatCard({ label, value, to, tone = 'neutral' }: StatCardProps) {
  const inner = (
    <Card className={to ? 'hover:bg-muted-surface transition-colors' : ''}>
      <CardBody>
        <div className="text-xs text-muted">{label}</div>
        <div className={`text-3xl font-bold mt-1 ${toneClasses[tone]}`}>{value}</div>
      </CardBody>
    </Card>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}
