import { create } from 'zustand'
import type { SyncStatus } from '../lib/sync/types'
import type { GitSync } from '../lib/sync/git'

interface SyncState {
  gitSync: GitSync | null
  status: SyncStatus
  patExpiresAt: string | null
  setGitSync: (sync: GitSync | null) => void
  setStatus: (status: SyncStatus) => void
  setPatExpiresAt: (date: string | null) => void
}

export const useSyncStore = create<SyncState>()((set) => ({
  gitSync: null,
  status: { state: 'disconnected' },
  patExpiresAt: null,
  setGitSync: (sync) => set({ gitSync: sync }),
  setStatus: (status) => set({ status }),
  setPatExpiresAt: (date) => set({ patExpiresAt: date }),
}))
