import type { EntryMetadata } from '../types/filesystem'

/**
 * Calculate the current writing streak (consecutive days with entries)
 * Streak continues if yesterday has an entry (user can still write today)
 */
export function calculateStreak(entries: EntryMetadata[]): number {
  if (entries.length === 0) return 0

  // Get unique dates with entries, sorted descending (newest first)
  const datesWithEntries = new Set(entries.map(e => e.date))
  const sortedDates = Array.from(datesWithEntries).sort().reverse()

  if (sortedDates.length === 0) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todayStr = today.toISOString().split('T')[0]!
  const yesterdayStr = yesterday.toISOString().split('T')[0]!

  // Find the starting point for streak counting
  // If today has an entry, start from today
  // If yesterday has an entry (but not today), start from yesterday
  // Otherwise, streak is broken
  let startDate: Date
  if (datesWithEntries.has(todayStr)) {
    startDate = today
  } else if (datesWithEntries.has(yesterdayStr)) {
    startDate = yesterday
  } else {
    return 0 // Streak broken - no entry today or yesterday
  }

  // Count consecutive days backwards
  let streak = 0
  let currentDate = new Date(startDate)

  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0]!
    if (datesWithEntries.has(dateStr)) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

/**
 * Get word counts per day for a specific month
 * Returns a Map of day number (1-31) to total words that day
 */
export function getActivityForMonth(
  entries: EntryMetadata[],
  year: number,
  month: number // 0-indexed (0 = January)
): Map<number, number> {
  const activity = new Map<number, number>()

  for (const entry of entries) {
    const [entryYear, entryMonth, entryDay] = entry.date.split('-').map(Number)
    
    if (entryYear === year && entryMonth === month + 1) {
      const current = activity.get(entryDay!) || 0
      activity.set(entryDay!, current + entry.wordCount)
    }
  }

  return activity
}

export interface TotalStats {
  totalEntries: number
  totalWords: number
  totalDays: number
  averageWordsPerDay: number
  averageTimePerSession: number
}

/**
 * Calculate aggregate stats across all entries
 */
export function calculateTotalStats(entries: EntryMetadata[]): TotalStats {
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      totalWords: 0,
      totalDays: 0,
      averageWordsPerDay: 0,
      averageTimePerSession: 0,
    }
  }

  const totalWords = entries.reduce((sum, e) => sum + e.wordCount, 0)
  const totalTime = entries.reduce((sum, e) => sum + (e.writingTimeSeconds || 0), 0)
  const uniqueDays = new Set(entries.map(e => e.date)).size

  return {
    totalEntries: entries.length,
    totalWords,
    totalDays: uniqueDays,
    averageWordsPerDay: Math.round(totalWords / uniqueDays),
    averageTimePerSession: Math.round(totalTime / entries.length),
  }
}
