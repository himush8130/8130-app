import type { Part } from '../types/parts'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Badge } from './ui/Badge'

export function PartsCatalogList({ parts }: { parts: Part[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">קטלוג חלקים</h3>
          <span className="text-xs text-muted">{parts.length} פריטים</span>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted border-b border-border">
              <th className="text-start font-medium px-4 py-2">מק"ט</th>
              <th className="text-start font-medium px-4 py-2">שם</th>
              <th className="text-start font-medium px-4 py-2">מלאי</th>
              <th className="text-start font-medium px-4 py-2">סף נמוך</th>
              <th className="text-start font-medium px-4 py-2">מיקום</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => {
              const low = p.quantity <= p.min_threshold
              return (
                <tr key={p.sku} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-muted font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-2 text-foreground">{p.name}</td>
                  <td className="px-4 py-2">
                    {low
                      ? <Badge tone="warning">{p.quantity}</Badge>
                      : <span className="text-foreground">{p.quantity}</span>}
                  </td>
                  <td className="px-4 py-2 text-muted">{p.min_threshold}</td>
                  <td className="px-4 py-2 text-muted">{p.location ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardBody>
    </Card>
  )
}
