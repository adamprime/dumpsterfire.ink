import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore } from '../stores/appStore'
import { useSecurityStore } from '../stores/securityStore'
import {
  countWords,
  getOrCreateTodayEntry,
  getTodaySessions,
  entryId,
} from '../lib/entry-utils'
import { analyzeEntry } from '../lib/analysis'
import { decrypt, deobfuscate } from '../lib/crypto'
import type { EntryMetadata, DumpsterFireSettings } from '../types/filesystem'
import { MilkdownEditor } from './MilkdownEditor'
import { Calendar } from './Calendar'
import { EntryBrowser } from './EntryBrowser'
import { Settings } from './Settings'
import { SparksAnimation } from './SparksAnimation'
import { FireAnimation } from './FireAnimation'
import { WhatRemains } from './WhatRemains'
import { SaveIndicator } from './SaveIndicator'
import { useWritingStats } from '../hooks/useWritingStats'

interface EditorProps {
  onBackToDashboard?: () => void
}

export function Editor({ onBackToDashboard }: EditorProps) {
  const { storage, wordGoal, theme, setTheme, setStorage } = useAppStore()
  const { sessionPassword } = useSecurityStore()
  const [content, setContent] = useState('')
  const [metadata, setMetadata] = useState<EntryMetadata | null>(null)
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [todaySessions, setTodaySessions] = useState<EntryMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showBrowser, setShowBrowser] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editorSettings, setEditorSettings] = useState<DumpsterFireSettings['editor'] | null>(null)
  const [settings, setSettings] = useState<DumpsterFireSettings | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedContentRef = useRef('')
  
  // What Remains state
  const [showSparks, setShowSparks] = useState(false)
  const [showFireAnimation, setShowFireAnimation] = useState(false)
  const [showWhatRemains, setShowWhatRemains] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasShownSparksForGoal, setHasShownSparksForGoal] = useState(false)
  const [contentAtLastAnalysis, setContentAtLastAnalysis] = useState('')
  
  // Save state tracking
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)
  
  const { activeTimeSeconds, wpm, formattedTime, recordActivity, reset: resetStats } = useWritingStats(wordCount)

  const refreshTodaySessions = useCallback(async () => {
    if (!storage) return
    const sessions = await getTodaySessions(storage)
    setTodaySessions(sessions)
  }, [storage])

  const loadEditorSettings = useCallback(async () => {
    if (!storage) return
    const s = await storage.getSettings()
    setSettings(s)
    setEditorSettings(s.editor)
  }, [storage])

  useEffect(() => {
    if (!storage) return

    const loadEntry = async () => {
      try {
        const { id, content: c, meta: m } = await getOrCreateTodayEntry(storage)
        setContent(c)
        setMetadata(m)
        setCurrentEntryId(id)
        setWordCount(countWords(c))
        lastSavedContentRef.current = c
        if (m.analysis) {
          setContentAtLastAnalysis(c)
        }
        await refreshTodaySessions()
        await loadEditorSettings()
      } catch (err) {
        console.error('Failed to load entry:', err)
      } finally {
        setLoading(false)
      }
    }

    loadEntry()
  }, [storage, refreshTodaySessions, loadEditorSettings])

  const saveContent = useCallback(
    async (newContent: string) => {
      if (!storage || !metadata || !currentEntryId) return
      if (newContent === lastSavedContentRef.current) {
        setIsDirty(false)
        return
      }

      setSaving(true)
      try {
        const words = countWords(newContent)
        const updatedMetadata: EntryMetadata = {
          ...metadata,
          updatedAt: new Date().toISOString(),
          wordCount: words,
          goalReached: words >= wordGoal,
          writingTimeSeconds: activeTimeSeconds,
        }

        await storage.saveEntry(currentEntryId, newContent, updatedMetadata)
        setMetadata(updatedMetadata)
        lastSavedContentRef.current = newContent
        setIsDirty(false)
        setLastSaveTime(new Date())
      } catch (err) {
        console.error('Failed to save:', err)
      } finally {
        setSaving(false)
      }
    },
    [storage, metadata, currentEntryId, wordGoal, activeTimeSeconds]
  )

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent)
      setWordCount(countWords(newContent))
      setIsDirty(newContent !== lastSavedContentRef.current)
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

  // Trigger sparks when goal is reached
  useEffect(() => {
    if (wordGoal > 0 && wordCount >= wordGoal && !hasShownSparksForGoal && !showWhatRemains) {
      setShowSparks(true)
      setHasShownSparksForGoal(true)
      setTimeout(() => setShowSparks(false), 5500)
    }
  }, [wordCount, wordGoal, hasShownSparksForGoal, showWhatRemains])

  const resetGoalState = useCallback(() => {
    setHasShownSparksForGoal(false)
    setShowWhatRemains(false)
  }, [])

  const getApiKey = useCallback(async (provider: 'anthropic' | 'openai'): Promise<string | null> => {
    if (!settings) return null
    
    const encryptedKey = provider === 'anthropic' 
      ? settings.ai.anthropicKeyEncrypted 
      : settings.ai.openaiKeyEncrypted
    
    if (!encryptedKey) return null
    
    try {
      if (settings.security.mode === 'open') {
        return deobfuscate(encryptedKey)
      } else if (sessionPassword) {
        return await decrypt(JSON.parse(encryptedKey), sessionPassword)
      }
    } catch {
      return null
    }
    return null
  }, [settings, sessionPassword])

  const handleStrikeTheMatch = useCallback(async () => {
    setShowFireAnimation(true)
  }, [])

  const runAnalysis = useCallback(async () => {
    if (!settings?.ai.provider || content.length < 50 || !storage || !metadata || !currentEntryId) return
    
    setIsAnalyzing(true)
    setContentAtLastAnalysis(content)
    try {
      const apiKey = await getApiKey(settings.ai.provider)
      if (apiKey) {
        const analysis = await analyzeEntry(content, settings.ai.provider, apiKey)
        const updatedMetadata: EntryMetadata = { ...metadata, analysis }
        await storage.saveEntryMetadata(currentEntryId, updatedMetadata)
        setMetadata(updatedMetadata)
      }
    } catch (err) {
      console.error('Analysis failed:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }, [settings, content, getApiKey, storage, metadata, currentEntryId])

  const handleFireComplete = useCallback(async () => {
    setShowFireAnimation(false)
    setShowWhatRemains(true)
    
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    if (!metadata?.analysis) {
      await runAnalysis()
    }
  }, [metadata, runAnalysis])

  const handleRekindle = useCallback(async () => {
    await runAnalysis()
  }, [runAnalysis])

  const handleNewSession = async () => {
    if (!storage) return
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    await saveContent(content)

    setLoading(true)
    try {
      const dateStr = metadata?.date || new Date().toISOString().split('T')[0]!
      const { id, meta } = await storage.createEntry(dateStr)
      setContent('')
      setMetadata(meta)
      setCurrentEntryId(id)
      setWordCount(0)
      lastSavedContentRef.current = ''
      setContentAtLastAnalysis('')
      await refreshTodaySessions()
      resetGoalState()
    } catch (err) {
      console.error('Failed to create new session:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchSession = async (session: number) => {
    if (!storage || !metadata || session === metadata.session) return
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    await saveContent(content)

    setLoading(true)
    try {
      const id = entryId(metadata.date, session)
      const loaded = await storage.loadEntry(id)
      if (loaded) {
        setContent(loaded.content)
        setMetadata(loaded.meta)
        setCurrentEntryId(id)
        setWordCount(countWords(loaded.content))
        lastSavedContentRef.current = loaded.content
        if (loaded.meta.analysis) {
          setContentAtLastAnalysis(loaded.content)
        } else {
          setContentAtLastAnalysis('')
        }
        resetStats()
        resetGoalState()
      }
    } catch (err) {
      console.error('Failed to switch session:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleManualSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveContent(content)
  }, [content, saveContent])

  const handleDisconnect = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveContent(content)
    setStorage(null)
  }

  const handleCalendarSelect = async (_date: Date, entries: EntryMetadata[]) => {
    setShowCalendar(false)
    
    if (entries.length === 0) return
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    await saveContent(content)
    
    setLoading(true)
    try {
      const entry = entries[0]!
      const id = entryId(entry.date, entry.session)
      const loaded = await storage!.loadEntry(id)
      if (loaded) {
        setContent(loaded.content)
        setMetadata(loaded.meta)
        setCurrentEntryId(id)
        setWordCount(countWords(loaded.content))
        lastSavedContentRef.current = loaded.content
        if (loaded.meta.analysis) {
          setContentAtLastAnalysis(loaded.content)
        } else {
          setContentAtLastAnalysis('')
        }
        
        const today = new Date()
        const entryParts = entry.date.split('-').map(Number)
        const entryDate = new Date(entryParts[0]!, entryParts[1]! - 1, entryParts[2]!)
        if (entryDate.toDateString() === today.toDateString()) {
          await refreshTodaySessions()
        } else {
          setTodaySessions(entries)
        }
        
        resetStats()
      }
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
      const id = entryId(entry.date, entry.session)
      const loaded = await storage!.loadEntry(id)
      if (loaded) {
        setContent(loaded.content)
        setMetadata(loaded.meta)
        setCurrentEntryId(id)
        setWordCount(countWords(loaded.content))
        lastSavedContentRef.current = loaded.content
        if (loaded.meta.analysis) {
          setContentAtLastAnalysis(loaded.content)
        } else {
          setContentAtLastAnalysis('')
        }
        resetStats()
      }
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
        className="flex items-center justify-between px-6 py-3 sticky top-0 z-30"
        style={{ 
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        <div className="flex items-center gap-4">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="p-1.5 rounded-lg transition-colors hover:opacity-70"
              style={{ color: 'var(--color-text-muted)' }}
              title="Back to Dashboard"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </button>
          )}
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

          <SaveIndicator
            isDirty={isDirty}
            isSaving={saving}
            lastSaveTime={lastSaveTime}
            onSave={handleManualSave}
          />

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

      {/* Progress bar */}
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

      {/* Main content area - split view when What Remains is open */}
      <main className="flex-1 flex overflow-hidden">
        {/* Editor section */}
        <div 
          className={`flex-1 flex justify-center p-8 transition-all duration-500 relative ${
            showWhatRemains ? 'w-1/2' : 'w-full'
          }`}
        >
          {showWhatRemains && (
            <div 
              className="absolute inset-0 z-10 cursor-pointer transition-opacity duration-300"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setShowWhatRemains(false)}
            />
          )}
          
          <div
            className="w-full"
            style={{
              maxWidth: showWhatRemains ? '100%' : (
                editorSettings?.maxWidth === 'narrow' ? '512px'
                : editorSettings?.maxWidth === 'wide' ? '896px'
                : editorSettings?.maxWidth === 'full' ? '100%'
                : '672px'
              ),
            }}
          >
            <MilkdownEditor
              value={content}
              onChange={handleContentChange}
              fontSize={editorSettings?.fontSize}
              lineHeight={editorSettings?.lineHeight}
              fontFamily={editorSettings?.fontFamily}
              typewriterMode={!showWhatRemains}
            />
          </div>
        </div>

        {showWhatRemains && metadata && (
          <div 
            className="w-1/2 border-l animate-slide-in"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <WhatRemains
              metadata={metadata}
              isAnalyzing={isAnalyzing}
              onClose={() => setShowWhatRemains(false)}
              wordGoal={wordGoal}
              hasChanges={content !== contentAtLastAnalysis && contentAtLastAnalysis !== ''}
              onRekindle={handleRekindle}
            />
          </div>
        )}
      </main>

      {goalReached && !showWhatRemains && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <button
            onClick={handleStrikeTheMatch}
            className="px-6 py-3 text-base font-medium rounded-lg transition-all duration-300 shadow-xl hover:scale-105 animate-pulse-subtle"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              boxShadow: '0 0 30px rgba(255, 107, 53, 0.4)',
            }}
          >
            Strike the match
          </button>
        </div>
      )}

      <SparksAnimation trigger={showSparks} />
      <FireAnimation trigger={showFireAnimation} onComplete={handleFireComplete} />

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.5s ease-out forwards;
        }
        @keyframes pulse-subtle {
          0%, 100% {
            box-shadow: 0 0 30px rgba(255, 107, 53, 0.4);
          }
          50% {
            box-shadow: 0 0 50px rgba(255, 107, 53, 0.6);
          }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>

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
