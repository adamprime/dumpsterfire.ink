import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import type { DumpsterFireSettings } from '../types/filesystem'

interface ApiKeyConfigProps {
  onClose: () => void
}

export function ApiKeyConfig({ onClose }: ApiKeyConfigProps) {
  const { storage } = useAppStore()
  const [settings, setSettings] = useState<DumpsterFireSettings | null>(null)
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [provider, setProvider] = useState<'anthropic' | 'openai' | null>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<'anthropic' | 'openai' | null>(null)
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!storage) return

    storage.getSettings().then((s) => {
      setSettings(s)
      setProvider(s.ai.provider)
      if (s.ai.anthropicKey) setAnthropicKey(s.ai.anthropicKey)
      if (s.ai.openaiKey) setOpenaiKey(s.ai.openaiKey)
    })
  }, [storage])

  const handleSave = async () => {
    if (!storage || !settings) return

    setSaving(true)
    try {
      const updatedSettings: DumpsterFireSettings = {
        ...settings,
        ai: {
          ...settings.ai,
          provider,
          anthropicKey: anthropicKey || undefined,
          openaiKey: openaiKey || undefined,
        },
      }

      await storage.saveSettings(updatedSettings)
      onClose()
    } catch (err) {
      console.error('Failed to save API keys:', err)
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async (type: 'anthropic' | 'openai') => {
    const key = type === 'anthropic' ? anthropicKey : openaiKey
    if (!key) return

    setTesting(type)
    setTestResult(null)

    try {
      if (type === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        })

        if (response.ok) {
          setTestResult({ type: 'success', message: 'Anthropic API key is valid!' })
        } else {
          const error = await response.json()
          setTestResult({ type: 'error', message: error.error?.message || 'Invalid API key' })
        }
      } else {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` },
        })

        if (response.ok) {
          setTestResult({ type: 'success', message: 'OpenAI API key is valid!' })
        } else {
          const error = await response.json()
          setTestResult({ type: 'error', message: error.error?.message || 'Invalid API key' })
        }
      }
    } catch {
      setTestResult({ type: 'error', message: 'Failed to connect. Check your internet connection.' })
    } finally {
      setTesting(null)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-start justify-center z-50 pt-16"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg max-w-lg w-full mx-4"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-lg font-semibold">AI Configuration</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Your API keys are stored locally in your browser.
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Default Provider</label>
            <div className="flex gap-2">
              {(['anthropic', 'openai'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className="flex-1 py-2 text-sm rounded transition-colors"
                  style={{
                    backgroundColor: provider === p ? 'var(--color-accent)' : 'var(--color-bg)',
                    color: provider === p ? 'white' : 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {p === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI (GPT)'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Anthropic API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="flex-1 px-3 py-2 rounded text-sm"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <button
                onClick={() => testConnection('anthropic')}
                disabled={!anthropicKey || testing !== null}
                className="px-3 py-2 text-sm rounded"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  opacity: !anthropicKey || testing !== null ? 0.5 : 1,
                }}
              >
                {testing === 'anthropic' ? '...' : 'Test'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1 px-3 py-2 rounded text-sm"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <button
                onClick={() => testConnection('openai')}
                disabled={!openaiKey || testing !== null}
                className="px-3 py-2 text-sm rounded"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  opacity: !openaiKey || testing !== null ? 0.5 : 1,
                }}
              >
                {testing === 'openai' ? '...' : 'Test'}
              </button>
            </div>
          </div>

          {testResult && (
            <p
              className="text-sm"
              style={{ color: testResult.type === 'success' ? '#22c55e' : '#ef4444' }}
            >
              {testResult.message}
            </p>
          )}
        </div>

        <div className="p-4 border-t flex gap-2" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded text-sm"
            style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded text-sm"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
