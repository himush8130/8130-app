import { useParts } from '../hooks/useParts'
import { AppHeader } from '../components/AppHeader'
import { PartsCatalogList } from '../components/PartsCatalogList'
import { PendingPartActions } from '../components/PendingPartActions'
import { Card, CardBody } from '../components/ui/Card'
import { ComponentBadge } from '../feedback/ComponentBadge'

export function WarehouseHomePage() {
  const { data: parts, isLoading, error } = useParts()
  const lowStockCount = parts?.filter((p) => p.quantity <= p.min_threshold).length ?? 0

  return (
    <>
      <AppHeader subtitle="פאנל מחסנאי" />

      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
        <ComponentBadge id={4001} />
        {parts && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card>
              <CardBody>
                <div className="text-xs text-muted">פריטי קטלוג</div>
                <div className="text-2xl font-bold mt-1 text-foreground">{parts.length}</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-xs text-muted">מלאי נמוך</div>
                <div className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-warning' : 'text-foreground'}`}>
                  {lowStockCount}
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        <PendingPartActions />

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
