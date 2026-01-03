import { useState } from 'react'
import { verifyPassword } from '../lib/crypto'
import type { DumpsterFireSettings } from '../types/filesystem'

interface UnlockScreenProps {
  settings: DumpsterFireSettings
  onUnlock: (password: string) => void
  onDisconnect: () => void
}

export function UnlockScreen({ settings, onUnlock, onDisconnect }: UnlockScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setChecking(true)

    try {
      if (!settings.security.passwordHash || !settings.security.passwordSalt) {
        setError('Invalid security configuration')
        return
      }

      const saltBytes = Uint8Array.from(atob(settings.security.passwordSalt), c => c.charCodeAt(0))
      const isValid = await verifyPassword(password, settings.security.passwordHash, saltBytes)

      if (isValid) {
        onUnlock(password)
      } else {
        setError('Incorrect password')
        setPassword('')
      }
    } catch (err) {
      console.error('Failed to verify password:', err)
      setError('Failed to verify password')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-accent)' }}>
          Dumpster Fire
        </h1>
        <p className="text-lg mb-8" style={{ color: 'var(--color-text-muted)' }}>
          {settings.security.mode === 'encrypted' ? 'Your content is encrypted' : 'App is locked'}
        </p>

        <div
          className="rounded-lg p-6"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded text-center text-lg"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
                placeholder="Enter password"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm mb-4" style={{ color: '#ef4444' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={checking || !password}
              className="w-full py-3 rounded font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                opacity: checking || !password ? 0.5 : 1,
              }}
            >
              {checking ? 'Checking...' : 'Unlock'}
            </button>
          </form>

          <button
            onClick={onDisconnect}
            className="mt-4 text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Use a different folder
          </button>
        </div>
      </div>
    </div>
  )
}
