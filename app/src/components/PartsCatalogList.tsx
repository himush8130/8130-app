import { useMemo, useState } from 'react'
import type { Part } from '../types/parts'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Badge } from './ui/Badge'
import { Input } from './ui/Input'
import { ComponentBadge } from '../feedback/ComponentBadge'

export function PartsCatalogList({ parts }: { parts: Part[] }) {
  const [skuQuery, setSkuQuery] = useState('')
  const [nameQuery, setNameQuery] = useState('')

  const filtered = useMemo(() => {
    const sku  = skuQuery.trim().toLowerCase()
    const name = nameQuery.trim().toLowerCase()
    if (!sku && !name) return parts
    return parts.filter((p) => {
      const skuOk  = !sku  || p.sku.toLowerCase().includes(sku)
      const nameOk = !name || p.name.toLowerCase().includes(name)
      return skuOk && nameOk
    })
  }, [parts, skuQuery, nameQuery])

  return (
    <Card>
      <CardHeader>
        <ComponentBadge id={4002} />
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">קטלוג חלקים</h3>
          <span className="text-xs text-muted">
            {filtered.length} / {parts.length} פריטים
          </span>
        </div>
      </CardHeader>
      <CardBody className="border-b border-border bg-muted-surface grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="חיפוש לפי מק״ט"
          name="catalogSku"
          value={skuQuery}
          onChange={(e) => setSkuQuery(e.target.value)}
          placeholder="PRT-..."
        />
        <Input
          label="חיפוש לפי שם"
          name="catalogName"
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          placeholder="מסנן..."
        />
      </CardBody>
      <CardBody className="p-0">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">לא נמצאו פריטים</p>
        ) : (
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
              {filtered.map((p) => {
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
        )}
      </CardBody>
    </Card>
  )
}
