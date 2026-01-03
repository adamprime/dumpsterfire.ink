import { useState, useEffect } from 'react'
import { useAppStore, type Theme } from '../stores/appStore'
import { getSettings, saveSettings } from '../lib/filesystem'
import type { DumpsterFireSettings } from '../types/filesystem'

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
  const { folderHandle, wordGoal, setWordGoal, theme, setTheme } = useAppStore()
  const [localGoal, setLocalGoal] = useState(wordGoal)
  const [settings, setSettings] = useState<DumpsterFireSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!folderHandle) return
    getSettings(folderHandle).then(setSettings)
  }, [folderHandle])

  const handleSave = async () => {
    if (!folderHandle || !settings) return
    
    setSaving(true)
    try {
      setWordGoal(localGoal)
      
      const updatedSettings: DumpsterFireSettings = {
        ...settings,
        goals: { ...settings.goals, dailyWordGoal: localGoal },
      }
      await saveSettings(folderHandle, updatedSettings)
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
        className="rounded-lg max-w-md w-full mx-4"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-lg font-semibold">Settings</h2>
        </div>

        <div className="p-4 space-y-6">
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
                    if (!settings || !folderHandle) return
                    const newSettings = {
                      ...settings,
                      editor: { ...settings.editor, fontFamily: value },
                    }
                    setSettings(newSettings)
                    await saveSettings(folderHandle, newSettings)
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
                if (!settings || !folderHandle) return
                const newSettings = {
                  ...settings,
                  editor: { ...settings.editor, maxWidth: e.target.value as 'narrow' | 'medium' | 'wide' | 'full' },
                }
                setSettings(newSettings)
                await saveSettings(folderHandle, newSettings)
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
                if (!settings || !folderHandle) return
                const newSettings = {
                  ...settings,
                  editor: { ...settings.editor, fontSize: parseInt(e.target.value) },
                }
                setSettings(newSettings)
                await saveSettings(folderHandle, newSettings)
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
                if (!settings || !folderHandle) return
                const newSettings = {
                  ...settings,
                  editor: { ...settings.editor, lineHeight: parseFloat(e.target.value) },
                }
                setSettings(newSettings)
                await saveSettings(folderHandle, newSettings)
              }}
              className="w-full"
            />
          </div>
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
