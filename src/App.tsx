import { useEffect, useState } from 'react'
import { useAppStore } from './stores/appStore'
import { useSyncStore } from './stores/syncStore'
import { OpfsStorage } from './lib/storage/opfs'
import { loadSyncConfig } from './lib/sync/pat-store'
import { GitSync } from './lib/sync/git'
import { PROXY_URL } from './lib/sync/types'
import { createStatsRecomputer } from './lib/sync/recompute-stats'
import type { DumpsterFireSettings } from './types/filesystem'
import { Welcome } from './components/Welcome'
import { Dashboard } from './components/Dashboard'
import { Editor } from './components/Editor'
type AppView = 'dashboard' | 'editor'

export default function App() {
  const { storage, theme, setStorage } = useAppStore()
  const { setGitSync, setStatus, setPatExpiresAt } = useSyncStore()
  const [settings, setSettings] = useState<DumpsterFireSettings | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [view, setView] = useState<AppView>('dashboard')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    if (storage || initialized) return
    setInitialized(true)

    const tryAutoConnect = async () => {
      try {
        const opfs = new OpfsStorage()
        await opfs.initialize()
        const entries = await opfs.listEntries()
        const storedSettings = await opfs.getSettings()
        if (entries.length > 0 || storedSettings.version !== '1.0.0') {
          setStorage(opfs)

          // Auto-reconnect GitSync if config exists
          const syncConfig = await loadSyncConfig()
          if (syncConfig) {
            setPatExpiresAt(syncConfig.patExpiresAt)
            const root = await navigator.storage.getDirectory()
            const sync = new GitSync(root, { ...syncConfig, corsProxy: PROXY_URL }, setStatus, createStatsRecomputer(opfs))
            setGitSync(sync)
            // Pull latest on reconnect (fire and forget)
            sync.pull().catch(() => {})
          }
        }
      } catch {
        // OPFS not available or no data
      } finally {
        setCheckingAuth(false)
      }
    }

    tryAutoConnect()
  }, [storage, initialized, setStorage, setGitSync, setStatus, setPatExpiresAt])

  useEffect(() => {
    if (!storage) {
      setCheckingAuth(false)
      return
    }

    storage.getSettings().then((s) => {
      setSettings(s)
      setCheckingAuth(false)
    })
  }, [storage])

  useEffect(() => {
    setView('dashboard')
  }, [storage])

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
      </div>
    )
  }

  if (!storage) {
    return <Welcome />
  }

  const wordGoal = settings?.goals?.dailyWordGoal ?? 750

  if (view === 'dashboard') {
    return (
      <Dashboard
        wordGoal={wordGoal}
        onStartWriting={() => setView('editor')}
        onOpenSettings={() => setView('editor')}
        onDisconnect={() => setStorage(null)}
      />
    )
  }

  return (
    <Editor 
      onBackToDashboard={() => setView('dashboard')}
    />
  )
}
