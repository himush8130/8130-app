import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
import { ProtectedRoute } from './components/ProtectedRoute'
import { FeedbackBar } from './feedback/FeedbackBar'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
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
            path="/warehouse"
            element={
              <ProtectedRoute allow={['warehouse']}>
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
    </QueryClientProvider>
  </StrictMode>,
)
