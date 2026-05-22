import { StrictMode, Suspense, lazy, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import './index.css'
import { LoginPage } from './pages/LoginPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastHost } from './components/ToastHost'
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
const SettingsCopyFormatPage   = lazy(() => import('./pages/SettingsCopyFormatPage').then(m => ({ default: m.SettingsCopyFormatPage })))
const RequiredPartDetailPage   = lazy(() => import('./pages/RequiredPartDetailPage').then(m => ({ default: m.RequiredPartDetailPage })))
const TankMaintenancePage      = lazy(() => import('./pages/TankMaintenancePage').then(m => ({ default: m.TankMaintenancePage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

// Cleans up any leftover Service Worker + caches from previous app
// versions. The app is now an online-only website (per user direction
// — offline isn't a requirement), which eliminates the entire class
// of "stale shell, missing chunk" bugs that were forcing the
// "טען מחדש" screen on technicians.
registerServiceWorker()

/** Wraps a route element so an error in one page can't take the rest
 *  of the app down. The boundary auto-recovers once per scope per
 *  session. */
function Resilient({ scope, children }: { scope: string; children: ReactNode }) {
  return <ErrorBoundary scope={scope}>{children}</ErrorBoundary>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastHost />
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-muted text-sm">טוען…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Resilient scope="login"><LoginPage /></Resilient>} />

          <Route path="/technician" element={
            <Resilient scope="technician">
              <ProtectedRoute allow={['technician', 'manager']}>
                <TechnicianHomePage />
              </ProtectedRoute>
            </Resilient>
          } />

          <Route path="/manager" element={
            <Resilient scope="manager">
              <ProtectedRoute allow={['manager']}><ManagerHomePage /></ProtectedRoute>
            </Resilient>
          } />
          <Route path="/manager/vehicles" element={
            <Resilient scope="manager-vehicles">
              <ProtectedRoute><VehiclesBookPage /></ProtectedRoute>
            </Resilient>
          } />
          <Route path="/manager/anomalies" element={
            <Resilient scope="manager-anomalies">
              <ProtectedRoute allow={['manager']}><AnomalyQueuePage /></ProtectedRoute>
            </Resilient>
          } />
          <Route path="/manager/calls" element={
            <Resilient scope="manager-calls">
              <ProtectedRoute allow={['manager']}><AllCallsPage /></ProtectedRoute>
            </Resilient>
          } />
          <Route path="/manager/settings/professions" element={
            <Resilient scope="settings-professions">
              <ProtectedRoute allow={['manager']}><SettingsProfessionsPage /></ProtectedRoute>
            </Resilient>
          } />
          <Route path="/manager/settings/employees" element={
            <Resilient scope="settings-employees">
              <ProtectedRoute allow={['manager']}><SettingsEmployeesPage /></ProtectedRoute>
            </Resilient>
          } />
          <Route path="/manager/settings/vehicles" element={
            <Resilient scope="settings-vehicles">
              <ProtectedRoute allow={['manager']}><SettingsVehiclesPage /></ProtectedRoute>
            </Resilient>
          } />
          <Route path="/manager/settings/availability" element={
            <Resilient scope="settings-availability">
              <ProtectedRoute allow={['manager']}><SettingsAvailabilityPage /></ProtectedRoute>
            </Resilient>
          } />
          <Route path="/manager/settings/vehicles/:vehicleNumber/maintenance" element={
            <Resilient scope="tank-maintenance">
              <ProtectedRoute allow={['manager']}><TankMaintenancePage /></ProtectedRoute>
            </Resilient>
          } />
          <Route path="/manager/settings/copy-format" element={
            <Resilient scope="settings-copy-format">
              <ProtectedRoute allow={['manager']}><SettingsCopyFormatPage /></ProtectedRoute>
            </Resilient>
          } />

          <Route path="/warehouse" element={
            <Resilient scope="warehouse">
              <ProtectedRoute allow={['warehouse', 'manager']}><WarehouseHomePage /></ProtectedRoute>
            </Resilient>
          } />
          <Route path="/warehouse/required-part/:id" element={
            <Resilient scope="required-part">
              <ProtectedRoute allow={['warehouse', 'manager']}><RequiredPartDetailPage /></ProtectedRoute>
            </Resilient>
          } />

          <Route path="/call/:id" element={
            <Resilient scope="call-detail">
              <ProtectedRoute><CallDetailPage /></ProtectedRoute>
            </Resilient>
          } />

          <Route path="/vehicle/:vehicleNumber" element={
            <Resilient scope="vehicle-history">
              <ProtectedRoute><VehicleHistoryPage /></ProtectedRoute>
            </Resilient>
          } />

          <Route path="/notes" element={
            <Resilient scope="notes">
              <ProtectedRoute><NotesPage /></ProtectedRoute>
            </Resilient>
          } />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
