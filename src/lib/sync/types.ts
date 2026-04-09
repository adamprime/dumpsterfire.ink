export type SyncStatus =
  | { state: 'disconnected' }
  | { state: 'synced' }
  | { state: 'syncing'; operation: 'push' | 'pull' | 'clone' | 'commit' }
  | { state: 'offline'; pendingCommits: number }
  | { state: 'error'; message: string }

export interface GitSyncConfig {
  repoUrl: string
  pat: string
  patExpiresAt: string | null
  deviceId: string
  corsProxy: string
}

export interface PendingPush {
  timestamp: string
  retryCount: number
}

export const PROXY_URL = 'https://git-proxy.dumpsterfire.ink/proxy'
