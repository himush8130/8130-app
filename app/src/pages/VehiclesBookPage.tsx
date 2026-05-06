import { AppHeader } from '../components/AppHeader'
import { VehiclePicker } from '../components/VehiclePicker'
import { ComponentBadge } from '../feedback/ComponentBadge'

export function VehiclesBookPage() {
  return (
    <>
      <AppHeader subtitle="ספר רק״ם/כלי" />
      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4 pb-24">
        <ComponentBadge id={3021} />
        <VehiclePicker />
      </main>
    </>
  )
}
