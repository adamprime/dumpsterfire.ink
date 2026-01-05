import { useState, useEffect } from 'react'
import { StreakDisplay } from './StreakDisplay'
import { ActivityGrid } from './ActivityGrid'
import { QuickStats } from './QuickStats'
import { calculateStreak, getActivityForMonth, calculateTotalStats, type TotalStats } from '../lib/stats'
import { getAllEntries } from '../lib/filesystem'
import type { EntryMetadata } from '../types/filesystem'

interface DashboardProps {
  folderHandle: FileSystemDirectoryHandle
  wordGoal: number
  onStartWriting: () => void
  onOpenSettings: () => void
  onDisconnect: () => void
}

export function Dashboard({ 
  folderHandle, 
  wordGoal, 
  onStartWriting, 
  onOpenSettings,
  onDisconnect 
}: DashboardProps) {
  const [entries, setEntries] = useState<EntryMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState(0)
  const [stats, setStats] = useState<TotalStats>({
    totalEntries: 0,
    totalWords: 0,
    totalDays: 0,
    averageWordsPerDay: 0,
    averageTimePerSession: 0,
  })

  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())

  useEffect(() => {
    const loadData = async () => {
      try {
        const allEntries = await getAllEntries(folderHandle)
        setEntries(allEntries)
        setStreak(calculateStreak(allEntries))
        setStats(calculateTotalStats(allEntries))
      } catch (err) {
        console.error('Failed to load entries:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [folderHandle])

  const activity = getActivityForMonth(entries, viewYear, viewMonth)

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <p style={{ color: 'var(--color-text-muted)' }}>Loading your writing journey...</p>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Header */}
      <header 
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h1 
          className="text-xl font-bold"
          style={{ color: 'var(--color-accent)' }}
        >
          Dumpster Fire
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg transition-colors hover:opacity-70"
            style={{ color: 'var(--color-text-muted)' }}
            title="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
          <button
            onClick={onDisconnect}
            className="text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{ 
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            Disconnect
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Streak */}
        <StreakDisplay streak={streak} />

        {/* Start Writing CTA */}
        <div className="text-center">
          <button
            onClick={onStartWriting}
            className="px-8 py-4 text-xl font-semibold rounded-xl transition-all hover:scale-105 shadow-lg"
            style={{ 
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              boxShadow: '0 4px 20px rgba(255, 107, 53, 0.3)',
            }}
          >
            🔥 Start Writing
          </button>
          <p 
            className="text-sm mt-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {wordGoal} word goal
          </p>
        </div>

        {/* Quick Stats */}
        <QuickStats stats={stats} />

        {/* Activity Grid with navigation */}
        <div>
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={goToPrevMonth}
              className="p-2 rounded-lg transition-colors hover:opacity-70"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg transition-colors hover:opacity-70"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
          <ActivityGrid 
            activity={activity}
            year={viewYear}
            month={viewMonth}
            wordGoal={wordGoal}
          />
        </div>

        {/* Recent entries hint */}
        {entries.length > 0 && (
          <p 
            className="text-center text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Use the calendar or browser in the editor to view past entries
          </p>
        )}
      </main>
    </div>
  )
}
