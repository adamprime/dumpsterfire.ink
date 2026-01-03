import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { getAllEntries, searchEntries, formatEntryDate } from '../lib/entries'
import type { EntryWithPreview } from '../lib/entries'
import type { EntryMetadata } from '../types/filesystem'

interface EntryBrowserProps {
  onSelectEntry: (entry: EntryMetadata) => void
  onClose: () => void
}

export function EntryBrowser({ onSelectEntry, onClose }: EntryBrowserProps) {
  const { folderHandle } = useAppStore()
  const [entries, setEntries] = useState<EntryWithPreview[]>([])
  const [filteredEntries, setFilteredEntries] = useState<EntryWithPreview[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

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
  }, [loadEntries])

  useEffect(() => {
    setFilteredEntries(searchEntries(entries, searchQuery))
  }, [entries, searchQuery])

  const handleEntryClick = (entry: EntryWithPreview) => {
    onSelectEntry(entry)
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
