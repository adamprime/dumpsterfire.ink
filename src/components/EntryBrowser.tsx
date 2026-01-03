import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { useSecurityStore } from '../stores/securityStore'
import { getAllEntries, searchEntries, formatEntryDate, getEntryContent } from '../lib/entries'
import { getSettings, saveEntryMetadata } from '../lib/filesystem'
import { analyzeEntry } from '../lib/analysis'
import { decrypt, deobfuscate } from '../lib/crypto'
import type { EntryWithPreview } from '../lib/entries'
import type { EntryMetadata, DumpsterFireSettings } from '../types/filesystem'

interface EntryBrowserProps {
  onSelectEntry: (entry: EntryMetadata) => void
  onClose: () => void
}

export function EntryBrowser({ onSelectEntry, onClose }: EntryBrowserProps) {
  const { folderHandle } = useAppStore()
  const { sessionPassword } = useSecurityStore()
  const [entries, setEntries] = useState<EntryWithPreview[]>([])
  const [filteredEntries, setFilteredEntries] = useState<EntryWithPreview[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<DumpsterFireSettings | null>(null)
  const [analyzingEntry, setAnalyzingEntry] = useState<string | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const loadEntries = useCallback(async () => {
    if (!folderHandle) return
    
    setLoading(true)
    try {
      const allEntries = await getAllEntries(folderHandle)
      setEntries(allEntries)
      setFilteredEntries(allEntries)
    } catch (err) {
      console.error('Failed to load entries:', err)
    } finally {
      setLoading(false)
    }
  }, [folderHandle])

  useEffect(() => {
    loadEntries()
    if (folderHandle) {
      getSettings(folderHandle).then(setSettings)
    }
  }, [loadEntries, folderHandle])

  useEffect(() => {
    setFilteredEntries(searchEntries(entries, searchQuery))
  }, [entries, searchQuery])

  const handleEntryClick = (entry: EntryWithPreview) => {
    onSelectEntry(entry)
  }

  const getApiKey = async (provider: 'anthropic' | 'openai'): Promise<string | null> => {
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
  }

  const handleAnalyze = async (entry: EntryWithPreview, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!folderHandle || !settings?.ai.provider) return
    
    const entryKey = `${entry.date}-${entry.session}`
    setAnalyzingEntry(entryKey)
    setAnalyzeError(null)
    
    try {
      const apiKey = await getApiKey(settings.ai.provider)
      if (!apiKey) {
        setAnalyzeError('No API key configured')
        return
      }
      
      const content = await getEntryContent(folderHandle, entry.date, entry.session)
      if (!content || content.length < 50) {
        setAnalyzeError('Entry too short to analyze')
        return
      }
      
      const analysis = await analyzeEntry(content, settings.ai.provider, apiKey)
      
      // Save analysis to metadata
      const updatedMetadata: EntryMetadata = {
        ...entry,
        analysis,
      }
      await saveEntryMetadata(folderHandle, entry.date, entry.session, updatedMetadata)
      
      // Refresh entries
      await loadEntries()
    } catch (err) {
      console.error('Analysis failed:', err)
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzingEntry(null)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-start justify-center z-50 pt-16"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">All Entries</h2>
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          
          <input
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 rounded text-sm"
            style={{
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              Loading entries...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              {searchQuery ? 'No entries match your search' : 'No entries yet'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry) => (
                <button
                  key={`${entry.date}-${entry.session}`}
                  onClick={() => handleEntryClick(entry)}
                  className="w-full text-left p-3 rounded transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {formatEntryDate(entry.date)}
                      {entry.session > 1 && (
                        <span style={{ color: 'var(--color-text-muted)' }}>
                          {' '}· Session {entry.session}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {entry.analysis ? (
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: entry.analysis.sentiment.overall === 'positive' ? '#22c55e20' :
                              entry.analysis.sentiment.overall === 'negative' ? '#ef444420' : 'var(--color-border)',
                            color: entry.analysis.sentiment.overall === 'positive' ? '#22c55e' :
                              entry.analysis.sentiment.overall === 'negative' ? '#ef4444' : 'var(--color-text-muted)',
                          }}
                        >
                          {entry.analysis.sentiment.overall}
                        </span>
                      ) : settings?.ai.provider && entry.wordCount >= 50 ? (
                        <button
                          onClick={(e) => handleAnalyze(entry, e)}
                          disabled={analyzingEntry === `${entry.date}-${entry.session}`}
                          className="text-xs px-2 py-0.5 rounded transition-colors"
                          style={{
                            backgroundColor: 'var(--color-accent)',
                            color: 'white',
                            opacity: analyzingEntry === `${entry.date}-${entry.session}` ? 0.5 : 1,
                          }}
                        >
                          {analyzingEntry === `${entry.date}-${entry.session}` ? '...' : 'Analyze'}
                        </button>
                      ) : null}
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: entry.goalReached ? '#22c55e20' : 'var(--color-border)',
                          color: entry.goalReached ? '#22c55e' : 'var(--color-text-muted)',
                        }}
                      >
                        {entry.wordCount} words
                      </span>
                    </div>
                  </div>
                  
                  {entry.preview && (
                    <p
                      className="text-sm line-clamp-2"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {entry.preview}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          {analyzeError && (
            <p className="text-sm mb-3 text-center" style={{ color: '#ef4444' }}>
              {analyzeError}
            </p>
          )}
          <button
            onClick={onClose}
            className="w-full py-2 rounded text-sm"
            style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
