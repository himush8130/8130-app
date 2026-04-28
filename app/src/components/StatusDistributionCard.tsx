import { Card, CardBody, CardHeader } from './ui/Card'
import type { StatusDistribution } from '../hooks/useManagerReports'
import type { CallStatus } from '../types/db'

const labels: Record<CallStatus, string> = {
  new:               'חדשה (חריגה)',
  in_treatment:      'בטיפול',
  waiting_for_parts: 'ממתינה לחלקים',
  closed:            'סגורה',
  cancelled:         'בוטלה',
}

const tones: Record<CallStatus, string> = {
  new:               'text-danger',
  in_treatment:      'text-info',
  waiting_for_parts: 'text-warning',
  closed:            'text-success',
  cancelled:         'text-muted',
}

export function StatusDistributionCard({ rows }: { rows: StatusDistribution[] }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-foreground">התפלגות לפי סטטוס</h3>
      </CardHeader>
      <CardBody className="p-0">
        <ul>
          {rows.map((row) => (
            <li
              key={row.status}
              className="flex items-center justify-between px-4 py-2 border-b border-border last:border-0 text-sm"
            >
              <span className={tones[row.status]}>{labels[row.status]}</span>
              <span className="text-foreground font-medium">{row.count}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}
