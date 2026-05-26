import { create } from 'zustand'

export type AILoadState = 'idle' | 'loading' | 'ready' | 'unavailable'
export type AIMode = 'webllm' | 'server' | 'none'

interface AIStatusState {
  state: AILoadState
  loadingPct: number
  aiMode: AIMode
  setState: (s: AILoadState) => void
  setLoadingPct: (pct: number) => void
  setAIMode: (m: AIMode) => void
}

export const useAIStatusStore = create<AIStatusState>((set) => ({
  state: 'idle',
  loadingPct: 0,
  aiMode: 'none',
  setState: (state) => set({ state }),
  setLoadingPct: (loadingPct) => set({ loadingPct }),
  setAIMode: (aiMode) => set({ aiMode }),
}))
