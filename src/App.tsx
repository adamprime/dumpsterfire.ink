import { useEffect, useState } from 'react'
import { useAppStore } from './stores/appStore'
import { useSecurityStore } from './stores/securityStore'
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

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

  if (!storage) {
    return <Welcome />
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
      </div>
    )
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
