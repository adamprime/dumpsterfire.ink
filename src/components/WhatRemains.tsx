import { QuillLoader } from './QuillLoader'
import type { EntryMetadata } from '../types/filesystem'

interface WhatRemainsProps {
  metadata: EntryMetadata
  isAnalyzing: boolean
  onClose: () => void
  wordGoal: number
  hasChanges?: boolean
  onRekindle?: () => void
}

export function WhatRemains({ metadata, isAnalyzing, onClose, wordGoal, hasChanges, onRekindle }: WhatRemainsProps) {
  const analysis = metadata.analysis
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs}s`
    return `${mins}m ${secs}s`
  }

  const wpm = metadata.writingTimeSeconds > 0 
    ? Math.round((metadata.wordCount / metadata.writingTimeSeconds) * 60)
    : 0

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '#22c55e'
      case 'negative': return '#ef4444'
      case 'mixed': return '#f59e0b'
      default: return 'var(--color-text-muted)'
    }
  }

  return (
    <div 
      className="h-full flex flex-col"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      {/* Header */}
      <div 
        className="p-6 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
            What Remains
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {new Date(metadata.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full transition-colors hover:opacity-70"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Close analysis"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isAnalyzing ? (
          <div className="h-full flex items-center justify-center">
            <QuillLoader />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg)' }}
              >
                <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
                  {metadata.wordCount}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  words {wordGoal > 0 && `/ ${wordGoal} goal`}
                </p>
              </div>
              
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg)' }}
              >
                <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
                  {formatTime(metadata.writingTimeSeconds)}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  active writing
                </p>
              </div>
              
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg)' }}
              >
                <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
                  {wpm}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  words per minute
                </p>
              </div>
              
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg)' }}
              >
                <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
                  #{metadata.session}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  session today
                </p>
              </div>
            </div>

            {/* AI Analysis */}
            {analysis ? (
              <>
                {/* Sentiment */}
                <div>
                  <h3 
                    className="text-sm font-medium mb-2 uppercase tracking-wide"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Mood
                  </h3>
                  <div 
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{ 
                      backgroundColor: `${getSentimentColor(analysis.sentiment.overall)}20`,
                      color: getSentimentColor(analysis.sentiment.overall),
                    }}
                  >
                    <span className="capitalize font-medium">{analysis.sentiment.overall}</span>
                  </div>
                </div>

                {/* Themes */}
                {analysis.themes.length > 0 && (
                  <div>
                    <h3 
                      className="text-sm font-medium mb-2 uppercase tracking-wide"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      Themes
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.themes.map((theme, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-full text-sm"
                          style={{ 
                            backgroundColor: 'var(--color-bg)',
                            color: 'var(--color-text)',
                          }}
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mindset */}
                {analysis.mindset && (
                  <div>
                    <h3 
                      className="text-sm font-medium mb-2 uppercase tracking-wide"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      Mindset
                    </h3>
                    <p style={{ color: 'var(--color-text)' }}>
                      {analysis.mindset}
                    </p>
                  </div>
                )}

                {/* Summary */}
                {analysis.summary && (
                  <div>
                    <h3 
                      className="text-sm font-medium mb-2 uppercase tracking-wide"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      Summary
                    </h3>
                    <p 
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {analysis.summary}
                    </p>
                  </div>
                )}

                {/* Analyzed info */}
                <div 
                  className="pt-4 border-t flex items-center justify-between"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p 
                    className="text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Analyzed {new Date(analysis.analyzedAt).toLocaleString()} via {analysis.provider}
                  </p>
                  
                  {hasChanges && onRekindle && (
                    <button
                      onClick={onRekindle}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors hover:opacity-80"
                      style={{
                        backgroundColor: 'var(--color-accent)',
                        color: 'white',
                      }}
                    >
                      🔥 Rekindle
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div 
                className="text-center py-8"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <p>No analysis yet</p>
                <p className="text-sm mt-1">Analysis runs automatically when you hit your goal</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
