import { useMemo } from 'react'
import { useParts } from '../hooks/useParts'
import { AppHeader } from '../components/AppHeader'
import { PartsCatalogList } from '../components/PartsCatalogList'
import { PendingPartActions } from '../components/PendingPartActions'
import { PartsListSection } from '../components/PartsListSection'
import { Card, CardBody } from '../components/ui/Card'
import { ComponentBadge } from '../feedback/ComponentBadge'

export function WarehouseHomePage() {
  const { data: parts, isLoading, error } = useParts()

  const lowStock = useMemo(
    () => (parts ?? []).filter((p) => p.quantity < p.min_threshold),
    [parts],
  )
  const blockedSku = useMemo(
    () => (parts ?? []).filter((p) => p.is_sku_blocked),
    [parts],
  )

  return (
    <>
      <AppHeader subtitle="פאנל מחסנאי" />

      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
        <ComponentBadge id={4001} />

        {/* 4 collapsible tables. The active-actions table opens by
            default since it's the day-to-day work surface. */}
        <PendingPartActions defaultOpen />
        <PartsListSection
          title="מלאי נמוך"
          parts={lowStock}
          variant="low_stock"
          badgeId={4009}
          catalogHref="/warehouse?low_stock=1"
        />
        <PartsListSection
          title="מק״טים חסומים"
          parts={blockedSku}
          variant="blocked_sku"
          badgeId={4010}
          catalogHref="/warehouse?sku_blocked=1"
        />
        <PendingPartActions rejectedOnly />

        {isLoading && <p className="text-sm text-muted text-center py-4">טוען קטלוג...</p>}
        {error && (
          <Card>
            <CardBody>
              <p className="text-danger text-sm">שגיאה בטעינת הקטלוג</p>
            </CardBody>
          </Card>
        )}
        {parts && <PartsCatalogList parts={parts} />}
      </main>
    </>
  )
}
