import { useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { OpfsStorage } from '../lib/storage/opfs'

export function Welcome() {
  const { setStorage } = useAppStore()
  const [error, setError] = useState<string | null>(null)

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

        <div
          className="rounded-lg p-8 mb-6"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <h2 className="text-xl font-semibold mb-4">Get Started</h2>
          <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Your writing is stored locally in your browser. No cloud, no
            servers, just you and your words.
          </p>

          <button
            onClick={handleStart}
            className="w-full py-3 px-6 rounded-lg font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'white',
            }}
          >
            Start Writing
          </button>

          {error && (
            <p className="text-sm mt-3" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}
        </div>

        {isIosSafari && (
          <div
            className="rounded-lg p-4 mb-4 text-sm text-left"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-accent)' }}
          >
            <p className="font-medium mb-1">Add to Home Screen recommended</p>
            <p style={{ color: 'var(--color-text-muted)' }}>
              On iOS Safari, browser storage may be cleared after 7 days of
              inactivity. Add this app to your Home Screen for persistent
              storage, or enable GitHub Sync in settings to back up your writing.
            </p>
          </div>
        )}

        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Your data never leaves your device. Everything is stored locally
          in your browser's private storage.
        </p>
      </div>
    </div>
  )
}
