import { useEffect, useState } from 'react'
import { useAppStore } from './stores/appStore'
import { useSecurityStore } from './stores/securityStore'
import { getSettings } from './lib/filesystem'
import type { DumpsterFireSettings } from './types/filesystem'
import { Welcome } from './components/Welcome'
import { Editor } from './components/Editor'
import { UnlockScreen } from './components/UnlockScreen'

export default function App() {
  const { folderHandle, theme, setFolderHandle } = useAppStore()
  const { isUnlocked, setUnlocked } = useSecurityStore()
  const [settings, setSettings] = useState<DumpsterFireSettings | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!folderHandle) {
      setCheckingAuth(false)
      return
    }

    getSettings(folderHandle).then((s) => {
      setSettings(s)
      setCheckingAuth(false)
    })
  }, [folderHandle])

  if (!folderHandle) {
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
        onDisconnect={() => setFolderHandle(null)}
      />
    )
  }

  return <Editor />
}
