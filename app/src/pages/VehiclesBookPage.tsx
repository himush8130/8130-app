import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { VehiclePicker } from '../components/VehiclePicker'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { useAuthStore } from '../store/auth'

export function VehiclesBookPage() {
  const employee = useAuthStore((s) => s.employee)
  const isWarehouse = employee?.permissions === 'warehouse'

  return (
    <>
      <AppHeader subtitle="ספר רק״ם/כלי" />
      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4 pb-24">
        <ComponentBadge id={3021} />
        {isWarehouse && (
          <Link
            to="/warehouse"
            className="self-start text-sm text-primary hover:underline"
          >
            → חזור למחסנאי
          </Link>
        )}
        <VehiclePicker />
      </main>
    </>
  )
}
