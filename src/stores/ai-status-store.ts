import { create } from 'zustand'

export type AILoadState = 'idle' | 'loading' | 'ready' | 'unavailable'

interface AIStatusState {
  state: AILoadState
  loadingPct: number
  setState: (s: AILoadState) => void
  setLoadingPct: (pct: number) => void
}

export const useAIStatusStore = create<AIStatusState>((set) => ({
  state: 'idle',
  loadingPct: 0,
  setState: (state) => set({ state }),
  setLoadingPct: (loadingPct) => set({ loadingPct }),
}))
