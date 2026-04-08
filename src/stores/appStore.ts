import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EntryStorage } from '../lib/storage/types'

export type Theme = 'dark' | 'light' | 'sepia' | 'matrix' | 'parchment'

interface AppState {
  storage: EntryStorage | null
  theme: Theme
  wordGoal: number
  setStorage: (storage: EntryStorage | null) => void
  setTheme: (theme: Theme) => void
  setWordGoal: (goal: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      storage: null,
      theme: 'dark',
      wordGoal: 750,
      setStorage: (storage) => set({ storage }),
      setTheme: (theme) => set({ theme }),
      setWordGoal: (goal) => set({ wordGoal: goal }),
    }),
    {
      name: 'dumpster-fire-settings',
      partialize: (state) => ({
        theme: state.theme,
        wordGoal: state.wordGoal,
      }),
    }
  )
)
