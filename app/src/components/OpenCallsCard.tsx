import { Link } from 'react-router-dom'
import { Card, CardBody } from './ui/Card'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { OpenCallsBucket } from '../hooks/useManagerOverview'

interface Props {
  total:      number
  breakdown?: OpenCallsBucket[]
}

export function OpenCallsCard({ total, breakdown }: Props) {
  const buckets = breakdown ?? []
  return (
    <Link to="/manager/calls" className="block">
      <Card className="hover:bg-muted-surface transition-colors">
        <CardBody>
          <ComponentBadge id={3002} />
          <div className="text-2xl font-bold text-foreground">
            <span>{total}</span>
            <span className="ms-2">קריאות פתוחות</span>
          </div>

          {buckets.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-sm">
              {buckets.map((b, i) => (
                <span key={b.label} className="flex items-baseline gap-1">
                  <span className="text-muted">{b.label}:</span>
                  <strong className="text-foreground">{b.total}</strong>
                  <span className={b.disabling > 0 ? 'text-danger font-medium' : 'text-muted'}>
                    ({b.disabling})
                  </span>
                  {i < buckets.length - 1 && <span className="text-faint">|</span>}
                </span>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </Link>
  )
}
