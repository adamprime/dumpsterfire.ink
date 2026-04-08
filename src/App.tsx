import { useEffect, useState } from 'react'
import { useAppStore } from './stores/appStore'
import { useSecurityStore } from './stores/securityStore'
import { OpfsStorage } from './lib/storage/opfs'
import type { DumpsterFireSettings } from './types/filesystem'
import { Welcome } from './components/Welcome'
import { Dashboard } from './components/Dashboard'
import { Editor } from './components/Editor'
import { UnlockScreen } from './components/UnlockScreen'
type AppView = 'dashboard' | 'editor'

export default function App() {
  const { storage, theme, setStorage } = useAppStore()
  const { isUnlocked, setUnlocked } = useSecurityStore()
  const [settings, setSettings] = useState<DumpsterFireSettings | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [view, setView] = useState<AppView>('dashboard')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Auto-initialize OPFS on app load if we have existing data
  useEffect(() => {
    if (storage || initialized) return
    setInitialized(true)

    const tryAutoConnect = async () => {
      try {
        const opfs = new OpfsStorage()
        await opfs.initialize()
        // Check if there are existing entries or settings
        const entries = await opfs.listEntries()
        const storedSettings = await opfs.getSettings()
        if (entries.length > 0 || storedSettings.version !== '1.0.0') {
          // Has existing data, auto-connect
          setStorage(opfs)
        }
      } catch {
        // OPFS not available or no data -- show Welcome
      } finally {
        setCheckingAuth(false)
      }
    }

    tryAutoConnect()
  }, [storage, initialized, setStorage])

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

  // Reset view when storage changes
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

  // Check if password is required
  const needsUnlock = settings?.security.mode !== 'open' && !isUnlocked

  if (needsUnlock && settings) {
    return (
      <UnlockScreen
        settings={settings}
        onUnlock={setUnlocked}
        onDisconnect={() => setStorage(null)}
      />
    )
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
