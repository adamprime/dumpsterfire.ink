import { create } from 'zustand'

interface SecurityState {
  isUnlocked: boolean
  sessionPassword: string | null
  setUnlocked: (password: string) => void
  lock: () => void
}

export const useSecurityStore = create<SecurityState>((set) => ({
  isUnlocked: false,
  sessionPassword: null,
  setUnlocked: (password) => set({ isUnlocked: true, sessionPassword: password }),
  lock: () => set({ isUnlocked: false, sessionPassword: null }),
}))
