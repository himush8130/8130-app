import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { EmployeeRole } from '../types/db'
import { useAuthStore } from '../store/auth'

interface ProtectedRouteProps {
  allow?: EmployeeRole[] // if omitted, any role
  children: ReactNode
}

export function ProtectedRoute({ allow, children }: ProtectedRouteProps) {
  const employee = useAuthStore((s) => s.employee)
  if (!employee) return <Navigate to="/login" replace />
  if (allow && !allow.includes(employee.role)) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
