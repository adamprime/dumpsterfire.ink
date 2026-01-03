import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { getMonthDays, getMonthName, getEntriesForMonth } from '../lib/calendar'
import type { DayInfo } from '../lib/calendar'
import type { EntryMetadata } from '../types/filesystem'

interface CalendarProps {
  onSelectDate: (date: Date, entries: EntryMetadata[]) => void
  onClose: () => void
}

export function Calendar({ onSelectDate, onClose }: CalendarProps) {
  const { folderHandle, wordGoal } = useAppStore()
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [days, setDays] = useState<DayInfo[]>([])
  const [loading, setLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const loadMonth = useCallback(async () => {
    if (!folderHandle) return
    
    setLoading(true)
    try {
      const entries = await getEntriesForMonth(folderHandle, year, month)
      const monthDays = getMonthDays(year, month, entries, wordGoal)
      setDays(monthDays)
    } catch (err) {
      console.error('Failed to load calendar:', err)
    } finally {
      setLoading(false)
    }
  }, [folderHandle, year, month, wordGoal])

  useEffect(() => {
    loadMonth()
  }, [loadMonth])

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleDayClick = (day: DayInfo) => {
    if (day.entries.length > 0 || day.isCurrentMonth) {
      onSelectDate(day.date, day.entries)
    }
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div
      className="fixed inset-0 flex items-start justify-center z-50 pt-16"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg p-6 max-w-md w-full mx-4"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevMonth}
            className="p-2 rounded hover:opacity-80"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ←
          </button>
          
          <div className="text-center">
            <h2 className="text-lg font-semibold">
              {getMonthName(month)} {year}
            </h2>
            <button
              onClick={goToToday}
              className="text-xs mt-1"
              style={{ color: 'var(--color-accent)' }}
            >
              Today
            </button>
          </div>
          
          <button
            onClick={goToNextMonth}
            className="p-2 rounded hover:opacity-80"
            style={{ color: 'var(--color-text-muted)' }}
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium py-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {day}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
            Loading...
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => (
              <button
                key={index}
                onClick={() => handleDayClick(day)}
                disabled={!day.isCurrentMonth && day.entries.length === 0}
                className="aspect-square p-1 rounded text-sm relative flex flex-col items-center justify-center transition-colors"
                style={{
                  backgroundColor: day.isToday
                    ? 'var(--color-accent)'
                    : day.entries.length > 0
                    ? 'var(--color-border)'
                    : 'transparent',
                  color: day.isToday
                    ? 'white'
                    : day.isCurrentMonth
                    ? 'var(--color-text)'
                    : 'var(--color-text-muted)',
                  opacity: day.isCurrentMonth ? 1 : 0.4,
                  cursor: day.isCurrentMonth || day.entries.length > 0 ? 'pointer' : 'default',
                }}
              >
                <span>{day.dayOfMonth}</span>
                {day.entries.length > 0 && (
                  <span
                    className="absolute bottom-1 w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: day.goalReached ? '#22c55e' : 'var(--color-accent)',
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />
            <span>Writing</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
            <span>Goal reached</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 rounded text-sm"
          style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text)' }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
