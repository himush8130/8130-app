import { Link } from 'react-router-dom'
import { Card, CardBody } from './ui/Card'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { OpenCallsBucket } from '../hooks/useManagerOverview'

interface Props {
  total:     number
  breakdown: OpenCallsBucket[]
}

export function OpenCallsCard({ total, breakdown }: Props) {
  return (
    <Link to="/manager/calls" className="block">
      <Card className="hover:bg-muted-surface transition-colors">
        <CardBody>
          <ComponentBadge id={3002} />
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="text-xs text-muted">קריאות פתוחות</span>
            <span className="text-3xl font-bold text-foreground">{total}</span>
          </div>

          {breakdown.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {breakdown.map((b, i) => (
                <span key={b.label} className="flex items-baseline gap-1">
                  <span className="text-muted">{b.label}:</span>
                  <strong className="text-foreground">{b.total}</strong>
                  <span className="text-xs text-muted">
                    (משביתות: <span className={b.disabling > 0 ? 'text-danger font-medium' : ''}>{b.disabling}</span>)
                  </span>
                  {i < breakdown.length - 1 && <span className="text-faint">·</span>}
                </span>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </Link>
  )
}
