import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

import './index.css'
import { LoginPage } from './pages/LoginPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { UpdateBanner } from './components/UpdateBanner'
import { FeedbackBar } from './feedback/FeedbackBar'
import { registerServiceWorker } from './lib/registerSW'

// Lazy-loaded routes — keeps initial bundle small for faster mobile load.
const TechnicianHomePage      = lazy(() => import('./pages/TechnicianHomePage').then(m => ({ default: m.TechnicianHomePage })))
const CallDetailPage          = lazy(() => import('./pages/CallDetailPage').then(m => ({ default: m.CallDetailPage })))
const ManagerHomePage         = lazy(() => import('./pages/ManagerHomePage').then(m => ({ default: m.ManagerHomePage })))
const AnomalyQueuePage        = lazy(() => import('./pages/AnomalyQueuePage').then(m => ({ default: m.AnomalyQueuePage })))
const AllCallsPage            = lazy(() => import('./pages/AllCallsPage').then(m => ({ default: m.AllCallsPage })))
const WarehouseHomePage       = lazy(() => import('./pages/WarehouseHomePage').then(m => ({ default: m.WarehouseHomePage })))
const VehicleHistoryPage      = lazy(() => import('./pages/VehicleHistoryPage').then(m => ({ default: m.VehicleHistoryPage })))
const NotesPage               = lazy(() => import('./pages/NotesPage').then(m => ({ default: m.NotesPage })))
const SettingsProfessionsPage = lazy(() => import('./pages/SettingsProfessionsPage').then(m => ({ default: m.SettingsProfessionsPage })))
const SettingsEmployeesPage   = lazy(() => import('./pages/SettingsEmployeesPage').then(m => ({ default: m.SettingsEmployeesPage })))
const SettingsVehiclesPage    = lazy(() => import('./pages/SettingsVehiclesPage').then(m => ({ default: m.SettingsVehiclesPage })))
const SettingsAvailabilityPage = lazy(() => import('./pages/SettingsAvailabilityPage').then(m => ({ default: m.SettingsAvailabilityPage })))
const VehiclesBookPage         = lazy(() => import('./pages/VehiclesBookPage').then(m => ({ default: m.VehiclesBookPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24,    // keep cached entries for a day
      refetchOnWindowFocus: false,
    },
  },
})

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: '8130-query-cache',
})

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24h: stale cache OK for one day offline
      }}
    >
      <BrowserRouter>
        <ErrorBoundary>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-muted text-sm">טוען…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/technician"
            element={
              <ProtectedRoute allow={['technician', 'manager']}>
                <TechnicianHomePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/manager"
            element={
              <ProtectedRoute allow={['manager']}>
                <ManagerHomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/vehicles"
            element={
              <ProtectedRoute allow={['manager']}>
                <VehiclesBookPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/anomalies"
            element={
              <ProtectedRoute allow={['manager']}>
                <AnomalyQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/calls"
            element={
              <ProtectedRoute allow={['manager']}>
                <AllCallsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/settings/professions"
            element={
              <ProtectedRoute allow={['manager']}>
                <SettingsProfessionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/settings/employees"
            element={
              <ProtectedRoute allow={['manager']}>
                <SettingsEmployeesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/settings/vehicles"
            element={
              <ProtectedRoute allow={['manager']}>
                <SettingsVehiclesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/settings/availability"
            element={
              <ProtectedRoute allow={['manager']}>
                <SettingsAvailabilityPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/warehouse"
            element={
              <ProtectedRoute allow={['warehouse', 'manager']}>
                <WarehouseHomePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/call/:id"
            element={
              <ProtectedRoute>
                <CallDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vehicle/:vehicleNumber"
            element={
              <ProtectedRoute>
                <VehicleHistoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notes"
            element={
              <ProtectedRoute>
                <NotesPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
        <FeedbackBar />
        <UpdateBanner />
      </BrowserRouter>
    </PersistQueryClientProvider>
  </StrictMode>,
)
