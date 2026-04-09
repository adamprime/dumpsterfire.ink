import { describe, it, expect } from 'vitest'
import { 
  calculateStreak, 
  getActivityForMonth, 
  calculateTotalStats 
} from './stats'
import type { EntryMetadata } from '../types/filesystem'

const createMockEntry = (date: string, wordCount = 100, session = 1): EntryMetadata => ({
  id: `${date}-${session}`,
  date,
  session,
  createdAt: `${date}T10:00:00.000Z`,
  updatedAt: `${date}T10:30:00.000Z`,
  wordCount,
  goalReached: wordCount >= 750,
  writingTimeSeconds: 1800,
})

// Use local-date math matching calculateStreak's internal logic
function localDateStr(daysAgo = 0): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]!
}

describe('calculateStreak', () => {
  it('returns 0 for empty entries', () => {
    expect(calculateStreak([])).toBe(0)
  })

  it('returns 1 for single entry today', () => {
    const entries = [createMockEntry(localDateStr(0))]
    expect(calculateStreak(entries)).toBe(1)
  })

  it('returns 1 for single entry yesterday (streak continues today if written)', () => {
    const entries = [createMockEntry(localDateStr(1))]
    expect(calculateStreak(entries)).toBe(1)
  })

  it('counts consecutive days correctly', () => {
    const entries = [
      createMockEntry(localDateStr(0)),
      createMockEntry(localDateStr(1)),
      createMockEntry(localDateStr(2)),
    ]
    expect(calculateStreak(entries)).toBe(3)
  })

  it('breaks streak on gap', () => {
    const entries = [
      createMockEntry(localDateStr(0)),
      // Skip yesterday
      createMockEntry(localDateStr(2)),
    ]
    expect(calculateStreak(entries)).toBe(1) // Only today counts
  })

  it('handles multiple sessions per day as single day', () => {
    const today = localDateStr(0)
    const yesterday = localDateStr(1)
    const entries = [
      createMockEntry(today, 100, 1),
      createMockEntry(today, 200, 2),
      createMockEntry(today, 150, 3),
      createMockEntry(yesterday, 500, 1),
    ]
    expect(calculateStreak(entries)).toBe(2)
  })

  it('allows streak to continue if yesterday has entry but today does not yet', () => {
    const entries = [
      createMockEntry(localDateStr(1)),
      createMockEntry(localDateStr(2)),
    ]
    expect(calculateStreak(entries)).toBe(2)
  })
})

describe('getActivityForMonth', () => {
  it('returns empty map for no entries', () => {
    const result = getActivityForMonth([], 2026, 0) // January 2026
    expect(result.size).toBe(0)
  })

  it('counts words per day for the specified month', () => {
    const entries = [
      createMockEntry('2026-01-01', 100),
      createMockEntry('2026-01-01', 200, 2),
      createMockEntry('2026-01-15', 750),
      createMockEntry('2026-02-01', 500), // Different month
    ]
    const result = getActivityForMonth(entries, 2026, 0) // January
    
    expect(result.get(1)).toBe(300) // Jan 1: 100 + 200
    expect(result.get(15)).toBe(750) // Jan 15
    expect(result.has(2)).toBe(false) // Feb entry not included
  })
})

describe('calculateTotalStats', () => {
  it('returns zeros for empty entries', () => {
    const stats = calculateTotalStats([])
    expect(stats.totalEntries).toBe(0)
    expect(stats.totalWords).toBe(0)
    expect(stats.totalDays).toBe(0)
    expect(stats.averageWordsPerDay).toBe(0)
  })

  it('calculates totals correctly', () => {
    const entries = [
      createMockEntry('2026-01-01', 100),
      createMockEntry('2026-01-01', 200, 2),
      createMockEntry('2026-01-02', 500),
    ]
    const stats = calculateTotalStats(entries)
    
    expect(stats.totalEntries).toBe(3)
    expect(stats.totalWords).toBe(800)
    expect(stats.totalDays).toBe(2)
    expect(stats.averageWordsPerDay).toBe(400)
  })

  it('calculates average writing time', () => {
    const entries = [
      { ...createMockEntry('2026-01-01'), writingTimeSeconds: 600 },
      { ...createMockEntry('2026-01-02'), writingTimeSeconds: 1200 },
    ]
    const stats = calculateTotalStats(entries)
    
    expect(stats.averageTimePerSession).toBe(900) // (600 + 1200) / 2
  })
})
