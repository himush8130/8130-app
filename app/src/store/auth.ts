import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Employee } from '../types/db'

interface AuthState {
  employee: Employee | null
  setEmployee: (e: Employee | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      employee: null,
      setEmployee: (employee) => set({ employee }),
      logout: () => set({ employee: null }),
    }),
    { name: '8130-auth' },
  ),
)
