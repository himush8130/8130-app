import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useParts } from '../hooks/useParts'
import { AppHeader } from '../components/AppHeader'
import { PartsCatalogList } from '../components/PartsCatalogList'
import { PendingPartActions } from '../components/PendingPartActions'
import { ActivePartActions } from '../components/ActivePartActions'
import { PartsListSection } from '../components/PartsListSection'
import { Card, CardBody } from '../components/ui/Card'
import { ComponentBadge } from '../feedback/ComponentBadge'

export function WarehouseHomePage() {
  const { data: parts, isLoading, error } = useParts()

  const lowStock = useMemo(
    () => (parts ?? []).filter((p) => p.quantity < p.min_threshold),
    [parts],
  )

  return (
    <>
      <AppHeader subtitle="פאנל מחסן" />

      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
        <ComponentBadge id={4001} />

        <Link
          to="/warehouse/inventory-count"
          className="self-start text-xs px-3 py-1.5 rounded-md border border-border bg-card text-foreground hover:bg-muted-surface"
        >
          📋 ספירת מלאי
        </Link>

        {/* Collapsible tables. The active-actions table opens by
            default since it's the day-to-day work surface. */}
        <ActivePartActions />
        <PendingPartActions variant="rejected" />
        <PendingPartActions variant="blocked" />
        <PartsListSection
          title="מלאי נמוך"
          parts={lowStock}
          variant="low_stock"
          badgeId={4009}
          catalogHref="/warehouse?low_stock=1"
        />
        <PendingPartActions variant="not_consumed" />
        <PendingPartActions variant="rejected_final" />
        <PendingPartActions variant="wear_credited" />
        <PendingPartActions variant="delivered" />

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
