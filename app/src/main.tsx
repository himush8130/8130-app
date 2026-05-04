import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

import './index.css'
import { LoginPage } from './pages/LoginPage'
import { TechnicianHomePage } from './pages/TechnicianHomePage'
import { CallDetailPage } from './pages/CallDetailPage'
import { ManagerHomePage } from './pages/ManagerHomePage'
import { AnomalyQueuePage } from './pages/AnomalyQueuePage'
import { AllCallsPage } from './pages/AllCallsPage'
import { WarehouseHomePage } from './pages/WarehouseHomePage'
import { VehicleHistoryPage } from './pages/VehicleHistoryPage'
import { NotesPage } from './pages/NotesPage'
import { SettingsProfessionsPage } from './pages/SettingsProfessionsPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { FeedbackBar } from './feedback/FeedbackBar'
import { registerServiceWorker } from './lib/registerSW'

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
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/technician"
            element={
              <ProtectedRoute allow={['technician']}>
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
        <FeedbackBar />
      </BrowserRouter>
    </PersistQueryClientProvider>
  </StrictMode>,
)
