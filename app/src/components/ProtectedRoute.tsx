import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { EmployeePermissions } from '../types/db'
import { useAuthStore } from '../store/auth'

interface ProtectedRouteProps {
  allow?: EmployeePermissions[]   // if omitted, any logged-in user
  children: ReactNode
}

export function ProtectedRoute({ allow, children }: ProtectedRouteProps) {
  const employee = useAuthStore((s) => s.employee)
  if (!employee) return <Navigate to="/login" replace />
  if (allow && !allow.includes(employee.permissions)) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
