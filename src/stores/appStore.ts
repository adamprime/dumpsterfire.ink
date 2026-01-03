import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  folderHandle: FileSystemDirectoryHandle | null
  theme: 'dark' | 'light'
  wordGoal: number
  setFolderHandle: (handle: FileSystemDirectoryHandle | null) => void
  setTheme: (theme: 'dark' | 'light') => void
  setWordGoal: (goal: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      folderHandle: null,
      theme: 'dark',
      wordGoal: 750,
      setFolderHandle: (handle) => set({ folderHandle: handle }),
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
