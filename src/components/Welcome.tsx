import { useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { useSyncStore } from '../stores/syncStore'
import { OpfsStorage } from '../lib/storage/opfs'
import { GitSync } from '../lib/sync/git'
import { loadSyncConfig } from '../lib/sync/pat-store'
import { PROXY_URL } from '../lib/sync/types'
import { createStatsRecomputer } from '../lib/sync/recompute-stats'
import { GitSyncSetup } from './GitSyncSetup'

export function Welcome() {
  const { setStorage } = useAppStore()
  const { setGitSync, setStatus, setPatExpiresAt } = useSyncStore()
  const [error, setError] = useState<string | null>(null)
  const [showSyncSetup, setShowSyncSetup] = useState(false)

  const handleStart = async () => {
    try {
      const storage = new OpfsStorage()
      await storage.initialize()
      setStorage(storage)
    } catch (err) {
      console.error('Failed to initialize storage:', err)
      setError('Failed to initialize local storage. Please try again.')
    }
  }

  const handleSyncSetupComplete = async () => {
    setShowSyncSetup(false)
    try {
      const config = await loadSyncConfig()
      if (!config) return

      const storage = new OpfsStorage()
      await storage.initialize()

      const root = await navigator.storage.getDirectory()
      const sync = new GitSync(root, { ...config, corsProxy: PROXY_URL }, setStatus, createStatsRecomputer(storage))

      try {
        await sync.clone()
      } catch {
        // Empty repo -- initialize
        await sync.init()
      }

      setGitSync(sync)
      setPatExpiresAt(config.patExpiresAt)
      setStorage(storage)
    } catch (err) {
      console.error('Failed to set up sync:', err)
      setError('Sync setup failed. You can configure it later in Settings.')

      // Fall back to local-only mode
      const storage = new OpfsStorage()
      await storage.initialize()
      setStorage(storage)
    }
  }

  const isIosSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-accent)' }}>
          Dumpster Fire
        </h1>
        <p className="text-lg mb-8" style={{ color: 'var(--color-text-muted)' }}>
          Where your messy thoughts go to burn bright
        </p>

        <div className="space-y-4 mb-6">
          <div
            className="rounded-lg p-6"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h2 className="text-lg font-semibold mb-2">Start Writing</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Your writing is stored locally in your browser. No cloud, no
              servers, just you and your words.
            </p>
            <button
              onClick={handleStart}
              className="w-full py-3 px-6 rounded-lg font-medium transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
            >
              Start Writing
            </button>
          </div>

          <div
            className="rounded-lg p-6"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h2 className="text-lg font-semibold mb-2">Sync to GitHub</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Back up your writing to a private GitHub repo. Write on multiple
              devices. Your files, your repo, forever.
            </p>
            <button
              onClick={() => setShowSyncSetup(true)}
              className="w-full py-3 px-6 rounded-lg font-medium transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
              Set Up GitHub Sync
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm mb-4" style={{ color: '#ef4444' }}>
            {error}
          </p>
        )}

        {isIosSafari && (
          <div
            className="rounded-lg p-4 mb-4 text-sm text-left"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-accent)' }}
          >
            <p className="font-medium mb-1">Add to Home Screen recommended</p>
            <p style={{ color: 'var(--color-text-muted)' }}>
              On iOS Safari, browser storage may be cleared after 7 days of
              inactivity. Add this app to your Home Screen for persistent
              storage, or enable GitHub Sync to back up your writing.
            </p>
          </div>
        )}

        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Your data never leaves your device unless you enable GitHub Sync.
        </p>
      </div>

      {showSyncSetup && (
        <GitSyncSetup
          onComplete={handleSyncSetupComplete}
          onCancel={() => setShowSyncSetup(false)}
        />
      )}
    </div>
  )
}
