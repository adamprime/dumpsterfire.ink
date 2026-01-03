import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore } from '../stores/appStore'
import { useSecurityStore } from '../stores/securityStore'
import {
  getOrCreateEntry,
  saveEntry,
  saveEntryMetadata,
  countWords,
  createNewSession,
  getTodaySessions,
  loadSession,
  getSettings,
} from '../lib/filesystem'
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

export function Editor() {
  const { folderHandle, wordGoal, theme, setTheme, setFolderHandle } = useAppStore()
  const { sessionPassword } = useSecurityStore()
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
    if (!folderHandle) return
    const sessions = await getTodaySessions(folderHandle)
    setTodaySessions(sessions)
  }, [folderHandle])

  const loadEditorSettings = useCallback(async () => {
    if (!folderHandle) return
    const s = await getSettings(folderHandle)
    setSettings(s)
    setEditorSettings(s.editor)
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

        const parts = metadata.date.split('-').map(Number)
        const date = new Date(parts[0]!, parts[1]! - 1, parts[2]!)

        await saveEntry(folderHandle, date, metadata.session, newContent, updatedMetadata)
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
    [folderHandle, metadata, wordGoal, activeTimeSeconds]
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
      // Reset sparks after animation (extended to 5500ms)
      setTimeout(() => setShowSparks(false), 5500)
    }
  }, [wordCount, wordGoal, hasShownSparksForGoal, showWhatRemains])

  // Reset sparks flag when switching sessions
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
    if (!settings?.ai.provider || content.length < 50 || !folderHandle || !metadata) return
    
    setIsAnalyzing(true)
    setContentAtLastAnalysis(content)
    try {
      const apiKey = await getApiKey(settings.ai.provider)
      if (apiKey) {
        const analysis = await analyzeEntry(content, settings.ai.provider, apiKey)
        const updatedMetadata: EntryMetadata = { ...metadata, analysis }
        await saveEntryMetadata(folderHandle, metadata.date, metadata.session, updatedMetadata)
        setMetadata(updatedMetadata)
      }
    } catch (err) {
      console.error('Analysis failed:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }, [settings, content, getApiKey, folderHandle, metadata])

  const handleFireComplete = useCallback(async () => {
    setShowFireAnimation(false)
    setShowWhatRemains(true)
    
    // Scroll to top so What Remains panel is visible
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    // Start analysis if not already done
    if (!metadata?.analysis) {
      await runAnalysis()
    } else {
      // Track content at last analysis for rekindle detection
      setContentAtLastAnalysis(content)
    }
  }, [metadata, content, runAnalysis])

  const handleRekindle = useCallback(async () => {
    await runAnalysis()
  }, [runAnalysis])

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
      resetGoalState()
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
      resetGoalState()
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
        className="flex items-center justify-between px-6 py-3 sticky top-0 z-30"
        style={{ 
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg)',
        }}
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
          {/* Mask overlay when What Remains is open */}
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

        {/* What Remains panel */}
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

      {/* Strike the Match button - fixed at bottom center when goal reached */}
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
            🔥 Strike the match
          </button>
        </div>
      )}

      {/* Animations */}
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
