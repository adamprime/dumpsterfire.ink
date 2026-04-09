/**
 * PAT storage in IndexedDB (not localStorage) for marginally better XSS surface.
 * Stores: PAT string, repo URL, expiration date, device ID.
 */

const DB_NAME = 'dumpsterfire-sync'
const STORE_NAME = 'config'
const CONFIG_KEY = 'git-sync'

export interface GitSyncStoredConfig {
  repoUrl: string
  pat: string
  patExpiresAt: string | null
  deviceId: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadSyncConfig(): Promise<GitSyncStoredConfig | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(CONFIG_KEY)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function saveSyncConfig(config: GitSyncStoredConfig): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(config, CONFIG_KEY)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function deleteSyncConfig(): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(CONFIG_KEY)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export function generateDeviceId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  for (const b of bytes) id += chars[b % chars.length]
  return id
}

export function daysUntilExpiration(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
