import { useState } from 'react'
import { generateSalt, hashPassword } from '../lib/crypto'
import { getSettings, saveSettings } from '../lib/filesystem'
import type { DumpsterFireSettings } from '../types/filesystem'

interface PasswordSetupProps {
  folderHandle: FileSystemDirectoryHandle
  targetMode: 'app-lock' | 'encrypted'
  onComplete: (password: string) => void
  onCancel: () => void
}

export function PasswordSetup({ folderHandle, targetMode, onComplete, onCancel }: PasswordSetupProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSaving(true)
    try {
      const salt = generateSalt()
      const hash = await hashPassword(password, salt)
      
      const settings = await getSettings(folderHandle)
      const updatedSettings: DumpsterFireSettings = {
        ...settings,
        security: {
          mode: targetMode,
          passwordHash: hash,
          passwordSalt: btoa(String.fromCharCode(...salt)),
        },
      }
      
      await saveSettings(folderHandle, updatedSettings)
      onComplete(password)
    } catch (err) {
      console.error('Failed to set password:', err)
      setError('Failed to save password. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="rounded-lg p-6 max-w-md w-full mx-4"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <h2 className="text-lg font-semibold mb-2">Set Password</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
          {targetMode === 'app-lock' 
            ? 'Your password will be required to open the app. Files remain readable on disk.'
            : 'Your password will encrypt all content. Files will be unreadable without it.'}
        </p>

        <div
          className="p-3 rounded mb-4 text-sm"
          style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-accent)' }}
        >
          <strong>Warning:</strong> If you forget your password, your {targetMode === 'encrypted' ? 'encrypted data' : 'API keys'} cannot be recovered.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded"
              style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
              placeholder="At least 8 characters"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded"
              style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
              placeholder="Enter password again"
            />
          </div>

          {error && (
            <p className="text-sm mb-4" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 rounded text-sm"
              style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded text-sm"
              style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
            >
              {saving ? 'Setting up...' : 'Set Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
