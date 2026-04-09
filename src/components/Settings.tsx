import { useState, useEffect } from 'react'
import { useAppStore, type Theme } from '../stores/appStore'
import { useSyncStore } from '../stores/syncStore'
import type { DumpsterFireSettings } from '../types/filesystem'
import { ApiKeyConfig } from './ApiKeyConfig'
import { GitSyncSetup } from './GitSyncSetup'
import { loadSyncConfig, deleteSyncConfig, daysUntilExpiration } from '../lib/sync/pat-store'
import { PROXY_URL } from '../lib/sync/types'
import { GitSync } from '../lib/sync/git'

interface SettingsProps {
  onClose: () => void
}

const GOAL_PRESETS = [250, 500, 750, 1000, 1500]
const THEMES: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'matrix', label: 'Matrix' },
  { value: 'parchment', label: 'Parchment' },
]
const FONTS: { value: DumpsterFireSettings['editor']['fontFamily']; label: string; sample: string }[] = [
  { value: 'theme', label: 'Theme Default', sample: 'Aa' },
  { value: 'sans', label: 'Sans-serif', sample: 'Aa' },
  { value: 'serif', label: 'Serif', sample: 'Aa' },
  { value: 'mono', label: 'Monospace', sample: 'Aa' },
  { value: 'handwritten', label: 'Handwritten', sample: 'Aa' },
]

export function Settings({ onClose }: SettingsProps) {
  const { storage, wordGoal, setWordGoal, theme, setTheme } = useAppStore()
  const [localGoal, setLocalGoal] = useState(wordGoal)
  const [settings, setSettings] = useState<DumpsterFireSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [showApiConfig, setShowApiConfig] = useState(false)
  const [showSyncSetup, setShowSyncSetup] = useState(false)
  const [syncConnected, setSyncConnected] = useState(false)
  const [syncExpiresAt, setSyncExpiresAt] = useState<string | null>(null)
  const { gitSync, status, setGitSync, setStatus, setPatExpiresAt } = useSyncStore()

  useEffect(() => {
    if (!storage) return
    storage.getSettings().then(setSettings)
  }, [storage])

  useEffect(() => {
    loadSyncConfig().then((config) => {
      if (config) {
        setSyncConnected(true)
        setSyncExpiresAt(config.patExpiresAt)
      }
    })
  }, [])

  const handleSave = async () => {
    if (!storage || !settings) return
    
    setSaving(true)
    try {
      setWordGoal(localGoal)
      
      const updatedSettings: DumpsterFireSettings = {
        ...settings,
        goals: { ...settings.goals, dailyWordGoal: localGoal },
      }
      await storage.saveSettings(updatedSettings)
      onClose()
    } catch (err) {
      console.error('Failed to save settings:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-start justify-center z-50 pt-16"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg max-w-md w-full mx-4 max-h-[85vh] flex flex-col"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-lg font-semibold">Settings</h2>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto flex-1">
          {/* Word Goal */}
          <div>
            <label className="block text-sm font-medium mb-2">Daily Word Goal</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {GOAL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setLocalGoal(preset)}
                  className="px-3 py-1 text-sm rounded transition-colors"
                  style={{
                    backgroundColor: localGoal === preset ? 'var(--color-accent)' : 'var(--color-bg)',
                    color: localGoal === preset ? 'white' : 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={localGoal}
              onChange={(e) => setLocalGoal(Math.max(1, parseInt(e.target.value) || 0))}
              min={1}
              className="w-full px-3 py-2 rounded text-sm"
              style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Set to 0 for no goal (freeform mode)
            </p>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium mb-2">Theme</label>
            <div className="grid grid-cols-5 gap-2">
              {THEMES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className="px-2 py-2 text-xs rounded transition-colors"
                  style={{
                    backgroundColor: theme === value ? 'var(--color-accent)' : 'var(--color-bg)',
                    color: theme === value ? 'white' : 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium mb-2">Editor Font</label>
            <div className="grid grid-cols-5 gap-2">
              {FONTS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={async () => {
                    if (!settings || !storage) return
                    const newSettings = {
                      ...settings,
                      editor: { ...settings.editor, fontFamily: value },
                    }
                    setSettings(newSettings)
                    await storage.saveSettings(newSettings)
                  }}
                  className="px-2 py-2 text-xs rounded transition-colors"
                  style={{
                    backgroundColor: (settings?.editor.fontFamily || 'theme') === value ? 'var(--color-accent)' : 'var(--color-bg)',
                    color: (settings?.editor.fontFamily || 'theme') === value ? 'white' : 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                    fontFamily: value === 'sans' ? 'system-ui, sans-serif'
                      : value === 'serif' ? 'Georgia, serif'
                      : value === 'mono' ? 'Consolas, monospace'
                      : value === 'handwritten' ? "'Caveat', cursive"
                      : 'inherit',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              "Theme Default" uses the font designed for each theme
            </p>
          </div>

          {/* Editor Width */}
          <div>
            <label className="block text-sm font-medium mb-2">Editor Width</label>
            <select
              value={settings?.editor.maxWidth || 'medium'}
              onChange={async (e) => {
                if (!settings || !storage) return
                const newSettings = {
                  ...settings,
                  editor: { ...settings.editor, maxWidth: e.target.value as 'narrow' | 'medium' | 'wide' | 'full' },
                }
                setSettings(newSettings)
                await storage.saveSettings(newSettings)
              }}
              className="w-full px-3 py-2 rounded text-sm"
              style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            >
              <option value="narrow">Narrow (512px)</option>
              <option value="medium">Medium (672px)</option>
              <option value="wide">Wide (896px)</option>
              <option value="full">Full Width</option>
            </select>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Font Size: {settings?.editor.fontSize || 18}px
            </label>
            <input
              type="range"
              min={14}
              max={24}
              value={settings?.editor.fontSize || 18}
              onChange={async (e) => {
                if (!settings || !storage) return
                const newSettings = {
                  ...settings,
                  editor: { ...settings.editor, fontSize: parseInt(e.target.value) },
                }
                setSettings(newSettings)
                await storage.saveSettings(newSettings)
              }}
              className="w-full"
            />
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Line Height: {settings?.editor.lineHeight || 1.6}
            </label>
            <input
              type="range"
              min={1.2}
              max={2.0}
              step={0.1}
              value={settings?.editor.lineHeight || 1.6}
              onChange={async (e) => {
                if (!settings || !storage) return
                const newSettings = {
                  ...settings,
                  editor: { ...settings.editor, lineHeight: parseFloat(e.target.value) },
                }
                setSettings(newSettings)
                await storage.saveSettings(newSettings)
              }}
              className="w-full"
            />
          </div>

          {/* AI Configuration */}
          <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <label className="block text-sm font-medium mb-2">AI Analysis</label>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
              {settings?.ai.provider 
                ? `Using ${settings.ai.provider === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI (GPT)'}`
                : 'No AI provider configured'}
            </p>
            <button
              onClick={() => setShowApiConfig(true)}
              className="w-full py-2 text-sm rounded"
              style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            >
              Configure API Keys
            </button>
          </div>

          {/* GitHub Sync */}
          <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <label className="block text-sm font-medium mb-2">GitHub Sync</label>
            {syncConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs">
                  <span style={{ color: status.state === 'synced' ? '#22c55e' : status.state === 'error' ? '#ef4444' : 'var(--color-text-muted)' }}>
                    {status.state === 'synced' && '● Synced'}
                    {status.state === 'syncing' && '◌ Syncing...'}
                    {status.state === 'offline' && '◐ Offline'}
                    {status.state === 'error' && '✕ Error'}
                    {status.state === 'disconnected' && '○ Disconnected'}
                  </span>
                </div>
                {syncExpiresAt && (() => {
                  const days = daysUntilExpiration(syncExpiresAt)
                  if (days === null) return null
                  if (days <= 0) return (
                    <p className="text-xs" style={{ color: '#ef4444' }}>
                      Token expired. Paste a new one to resume sync.
                    </p>
                  )
                  if (days <= 14) return (
                    <p className="text-xs" style={{ color: days <= 3 ? '#ef4444' : '#f59e0b' }}>
                      Token expires in {days} day{days !== 1 ? 's' : ''}. Rotate now to avoid sync interruption.
                    </p>
                  )
                  return null
                })()}
                <div className="flex gap-2">
                  <button
                    onClick={() => gitSync?.push()}
                    disabled={!gitSync}
                    className="flex-1 py-2 text-xs rounded"
                    style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', opacity: !gitSync ? 0.5 : 1 }}
                  >
                    Push now
                  </button>
                  <button
                    onClick={() => gitSync?.pull()}
                    disabled={!gitSync}
                    className="flex-1 py-2 text-xs rounded"
                    style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', opacity: !gitSync ? 0.5 : 1 }}
                  >
                    Pull now
                  </button>
                </div>
                <button
                  onClick={async () => {
                    if (confirm('Disconnect GitHub Sync? Local writing will continue. You can reconnect anytime.')) {
                      if (gitSync) gitSync.destroy()
                      setGitSync(null)
                      setStatus({ state: 'disconnected' })
                      setPatExpiresAt(null)
                      await deleteSyncConfig()
                      setSyncConnected(false)
                      setSyncExpiresAt(null)
                    }
                  }}
                  className="w-full py-2 text-xs rounded"
                  style={{ backgroundColor: 'var(--color-bg)', color: '#ef4444', border: '1px solid var(--color-border)' }}
                >
                  Disconnect & Revoke Token
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  Back up your writing to a private GitHub repo. Write on multiple devices.
                </p>
                <button
                  onClick={() => setShowSyncSetup(true)}
                  className="w-full py-2 text-sm rounded"
                  style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                >
                  Set Up GitHub Sync
                </button>
              </div>
            )}
          </div>

        </div>

        <div className="p-4 border-t flex gap-2 flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
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

      {showApiConfig && (
        <ApiKeyConfig
          onClose={() => {
            setShowApiConfig(false)
            if (storage) {
              storage.getSettings().then(setSettings)
            }
          }}
        />
      )}

      {showSyncSetup && (
        <GitSyncSetup
          onComplete={async () => {
            setShowSyncSetup(false)
            const config = await loadSyncConfig()
            if (config) {
              setSyncConnected(true)
              setSyncExpiresAt(config.patExpiresAt)
              setPatExpiresAt(config.patExpiresAt)

              const root = await navigator.storage.getDirectory()
              const sync = new GitSync(root, { ...config, corsProxy: PROXY_URL }, setStatus)
              try {
                await sync.clone()
              } catch {
                await sync.init()
              }
              setGitSync(sync)
            }
          }}
          onCancel={() => setShowSyncSetup(false)}
        />
      )}
    </div>
  )
}
