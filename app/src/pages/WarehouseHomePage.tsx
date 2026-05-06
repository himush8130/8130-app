import { Link } from 'react-router-dom'
import { useParts } from '../hooks/useParts'
import { AppHeader } from '../components/AppHeader'
import { PartsCatalogList } from '../components/PartsCatalogList'
import { PendingPartActions } from '../components/PendingPartActions'
import { Card, CardBody } from '../components/ui/Card'
import { ComponentBadge } from '../feedback/ComponentBadge'

export function WarehouseHomePage() {
  const { data: parts, isLoading, error } = useParts()
  const lowStockCount   = parts?.filter((p) => p.quantity < p.min_threshold).length ?? 0
  const blockedSkuCount = parts?.filter((p) => p.is_sku_blocked).length ?? 0

  return (
    <>
      <AppHeader subtitle="פאנל מחסנאי" />

      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
        <ComponentBadge id={4001} />

        {parts && (
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <Link to="/warehouse?low_stock=1" className="block">
              <Card className="hover:bg-muted-surface transition-colors">
                <CardBody>
                  <div className="text-xs text-muted">מלאי נמוך</div>
                  <div className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-danger' : 'text-foreground'}`}>
                    {lowStockCount}
                  </div>
                </CardBody>
              </Card>
            </Link>
            <Link to="/warehouse?sku_blocked=1" className="block">
              <Card className="hover:bg-muted-surface transition-colors">
                <CardBody>
                  <div className="text-xs text-muted">מק״ט חסום</div>
                  <div className={`text-2xl font-bold mt-1 ${blockedSkuCount > 0 ? 'text-warning' : 'text-foreground'}`}>
                    {blockedSkuCount}
                  </div>
                </CardBody>
              </Card>
            </Link>
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
