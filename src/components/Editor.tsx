import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore } from '../stores/appStore'
import {
  getOrCreateEntry,
  saveEntry,
  countWords,
  createNewSession,
  getTodaySessions,
  loadSession,
} from '../lib/filesystem'
import type { EntryMetadata, DumpsterFireSettings } from '../types/filesystem'
import { MilkdownEditor } from './MilkdownEditor'
import { Calendar } from './Calendar'
import { EntryBrowser } from './EntryBrowser'
import { Settings } from './Settings'
import { useWritingStats } from '../hooks/useWritingStats'
import { getSettings } from '../lib/filesystem'

export function Editor() {
  const { folderHandle, wordGoal, theme, setTheme, setFolderHandle } = useAppStore()
  const [content, setContent] = useState('')
  const [metadata, setMetadata] = useState<EntryMetadata | null>(null)
  const [todaySessions, setTodaySessions] = useState<EntryMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showBrowser, setShowBrowser] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editorSettings, setEditorSettings] = useState<DumpsterFireSettings['editor'] | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedContentRef = useRef('')
  
  const { wpm, formattedTime, recordActivity, reset: resetStats } = useWritingStats(wordCount)

  const refreshTodaySessions = useCallback(async () => {
    if (!folderHandle) return
    const sessions = await getTodaySessions(folderHandle)
    setTodaySessions(sessions)
  }, [folderHandle])

  const loadEditorSettings = useCallback(async () => {
    if (!folderHandle) return
    const settings = await getSettings(folderHandle)
    setEditorSettings(settings.editor)
  }, [folderHandle])

  useEffect(() => {
    if (!folderHandle) return

    const loadEntry = async () => {
      try {
        const { content: c, metadata: m } = await getOrCreateEntry(folderHandle)
        setContent(c)
        setMetadata(m)
        setWordCount(countWords(c))
        lastSavedContentRef.current = c
        await refreshTodaySessions()
        await loadEditorSettings()
      } catch (err) {
        console.error('Failed to load entry:', err)
      } finally {
        setLoading(false)
      }
    }

    loadEntry()
  }, [folderHandle, refreshTodaySessions, loadEditorSettings])

  const saveContent = useCallback(
    async (newContent: string) => {
      if (!folderHandle || !metadata) return
      if (newContent === lastSavedContentRef.current) return

      setSaving(true)
      try {
        const words = countWords(newContent)
        const updatedMetadata: EntryMetadata = {
          ...metadata,
          updatedAt: new Date().toISOString(),
          wordCount: words,
          goalReached: words >= wordGoal,
        }

        const parts = metadata.date.split('-').map(Number)
        const date = new Date(parts[0]!, parts[1]! - 1, parts[2]!)

        await saveEntry(folderHandle, date, metadata.session, newContent, updatedMetadata)
        setMetadata(updatedMetadata)
        lastSavedContentRef.current = newContent
      } catch (err) {
        console.error('Failed to save:', err)
      } finally {
        setSaving(false)
      }
    },
    [folderHandle, metadata, wordGoal]
  )

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent)
      setWordCount(countWords(newContent))
      recordActivity()

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveContent(newContent)
      }, 2000)
    },
    [saveContent, recordActivity]
  )

  useEffect(() => {
    const handleBlur = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveContent(content)
    }

    window.addEventListener('blur', handleBlur)
    return () => window.removeEventListener('blur', handleBlur)
  }, [content, saveContent])

  const handleNewSession = async () => {
    if (!folderHandle) return
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    await saveContent(content)

    setLoading(true)
    try {
      const { content: c, metadata: m } = await createNewSession(folderHandle)
      setContent(c)
      setMetadata(m)
      setWordCount(0)
      lastSavedContentRef.current = c
      await refreshTodaySessions()
    } catch (err) {
      console.error('Failed to create new session:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchSession = async (session: number) => {
    if (!folderHandle || !metadata || session === metadata.session) return
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    await saveContent(content)

    setLoading(true)
    try {
      const parts = metadata.date.split('-').map(Number)
      const date = new Date(parts[0]!, parts[1]! - 1, parts[2]!)
      const { content: c, metadata: m } = await loadSession(folderHandle, date, session)
      setContent(c)
      setMetadata(m)
      setWordCount(countWords(c))
      lastSavedContentRef.current = c
      resetStats()
    } catch (err) {
      console.error('Failed to switch session:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveContent(content)
    setFolderHandle(null)
  }

  const handleCalendarSelect = async (_date: Date, entries: EntryMetadata[]) => {
    setShowCalendar(false)
    
    if (entries.length === 0) {
      // No entries for this day - could create one or just close
      return
    }
    
    // Save current content first
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    await saveContent(content)
    
    // Load the first session from the selected date
    setLoading(true)
    try {
      const entry = entries[0]!
      const parts = entry.date.split('-').map(Number)
      const entryDate = new Date(parts[0]!, parts[1]! - 1, parts[2]!)
      const { content: c, metadata: m } = await loadSession(folderHandle!, entryDate, entry.session)
      setContent(c)
      setMetadata(m)
      setWordCount(countWords(c))
      lastSavedContentRef.current = c
      
      // Update today's sessions if we're viewing today
      const today = new Date()
      if (entryDate.toDateString() === today.toDateString()) {
        await refreshTodaySessions()
      } else {
        setTodaySessions(entries)
      }
      
      resetStats()
    } catch (err) {
      console.error('Failed to load entry from calendar:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBrowserSelect = async (entry: EntryMetadata) => {
    setShowBrowser(false)
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    await saveContent(content)
    
    setLoading(true)
    try {
      const parts = entry.date.split('-').map(Number)
      const entryDate = new Date(parts[0]!, parts[1]! - 1, parts[2]!)
      const { content: c, metadata: m } = await loadSession(folderHandle!, entryDate, entry.session)
      setContent(c)
      setMetadata(m)
      setWordCount(countWords(c))
      lastSavedContentRef.current = c
      resetStats()
    } catch (err) {
      console.error('Failed to load entry from browser:', err)
    } finally {
      setLoading(false)
    }
  }

  const progress = Math.min((wordCount / wordGoal) * 100, 100)
  const goalReached = wordCount >= wordGoal

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-4">
          <h1 className="font-semibold" style={{ color: 'var(--color-accent)' }}>
            Dumpster Fire
          </h1>
          {metadata && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <span>{metadata.date}</span>
              <span>/</span>
              {todaySessions.length > 1 ? (
                <select
                  value={metadata.session}
                  onChange={(e) => handleSwitchSession(Number(e.target.value))}
                  className="bg-transparent border rounded px-1 py-0.5 cursor-pointer"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {todaySessions.map((s) => (
                    <option key={s.session} value={s.session}>
                      Session {s.session} ({s.wordCount} words)
                    </option>
                  ))}
                </select>
              ) : (
                <span>Session {metadata.session}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span
            className="text-sm font-medium"
            style={{ color: goalReached ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
          >
            {wordCount} / {wordGoal} words
            {goalReached && ' ✓'}
          </span>

          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {formattedTime}
          </span>

          {wpm > 0 && (
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {wpm} wpm
            </span>
          )}

          {saving && (
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Saving...
            </span>
          )}

          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as typeof theme)}
            className="px-2 py-1 text-sm rounded cursor-pointer"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            title="Select theme"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="sepia">Sepia</option>
            <option value="matrix">Matrix</option>
            <option value="parchment">Parchment</option>
          </select>

          <button
            onClick={() => setShowCalendar(true)}
            className="px-3 py-1 text-sm rounded transition-colors"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            title="View calendar"
          >
            📅
          </button>

          <button
            onClick={() => setShowBrowser(true)}
            className="px-3 py-1 text-sm rounded transition-colors"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            title="Browse all entries"
          >
            📋
          </button>

          <button
            onClick={handleNewSession}
            className="px-3 py-1 text-sm rounded transition-colors"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            New Session
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1 text-sm rounded transition-colors"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            title="Settings"
          >
            ⚙️
          </button>

          <button
            onClick={handleDisconnect}
            className="px-3 py-1 text-sm rounded transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Disconnect
          </button>
        </div>
      </header>

      <div
        className="h-1"
        style={{ backgroundColor: 'var(--color-border)' }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            backgroundColor: goalReached ? '#22c55e' : 'var(--color-accent)',
          }}
        />
      </div>

      <main className="flex-1 flex justify-center p-8">
        <div
          className="w-full"
          style={{
            maxWidth: editorSettings?.maxWidth === 'narrow' ? '512px'
              : editorSettings?.maxWidth === 'wide' ? '896px'
              : editorSettings?.maxWidth === 'full' ? '100%'
              : '672px',
          }}
        >
          <MilkdownEditor
            value={content}
            onChange={handleContentChange}
            fontSize={editorSettings?.fontSize}
            lineHeight={editorSettings?.lineHeight}
            fontFamily={editorSettings?.fontFamily}
          />
        </div>
      </main>

      {showCalendar && (
        <Calendar
          onSelectDate={handleCalendarSelect}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {showBrowser && (
        <EntryBrowser
          onSelectEntry={handleBrowserSelect}
          onClose={() => setShowBrowser(false)}
        />
      )}

      {showSettings && (
        <Settings
          onClose={() => {
            setShowSettings(false)
            loadEditorSettings()
          }}
        />
      )}
    </div>
  )
}
