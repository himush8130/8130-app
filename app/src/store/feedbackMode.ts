import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FeedbackModeState {
  enabled: boolean
  toggle: () => void
  setEnabled: (v: boolean) => void
}

export const useFeedbackMode = create<FeedbackModeState>()(
  persist(
    (set) => ({
      enabled: false,
      toggle: () => set((s) => ({ enabled: !s.enabled })),
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: '8130-feedback-mode' },
  ),
)
