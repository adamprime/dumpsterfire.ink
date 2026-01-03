import { describe, it, expect } from 'vitest'
import { getMonthDays, formatDateKey, isSameDay, getMonthName } from './calendar'
import type { EntryMetadata } from '../types/filesystem'

describe('calendar utilities', () => {
  describe('formatDateKey', () => {
    it('formats date as YYYY-MM-DD', () => {
      const date = new Date(2026, 0, 15)
      expect(formatDateKey(date)).toBe('2026-01-15')
    })

    it('pads single digit month and day', () => {
      const date = new Date(2026, 2, 5)
      expect(formatDateKey(date)).toBe('2026-03-05')
    })
  })

  describe('isSameDay', () => {
    it('returns true for same day', () => {
      const a = new Date(2026, 0, 15, 10, 30)
      const b = new Date(2026, 0, 15, 22, 45)
      expect(isSameDay(a, b)).toBe(true)
    })

    it('returns false for different days', () => {
      const a = new Date(2026, 0, 15)
      const b = new Date(2026, 0, 16)
      expect(isSameDay(a, b)).toBe(false)
    })
  })

  describe('getMonthName', () => {
    it('returns correct month names', () => {
      expect(getMonthName(0)).toBe('January')
      expect(getMonthName(6)).toBe('July')
      expect(getMonthName(11)).toBe('December')
    })
  })

  describe('getMonthDays', () => {
    it('returns array of day info for a month', () => {
      const entries = new Map<string, EntryMetadata[]>()
      const days = getMonthDays(2026, 0, entries, 750) // January 2026
      
      // Should include padding days from previous/next month
      expect(days.length).toBeGreaterThanOrEqual(28)
      expect(days.length % 7).toBe(0) // Always complete weeks
    })

    it('marks days with entries', () => {
      const entries = new Map<string, EntryMetadata[]>()
      entries.set('2026-01-15', [{
        id: '1',
        date: '2026-01-15',
        session: 1,
        createdAt: '',
        updatedAt: '',
        wordCount: 500,
        goalReached: false,
        writingTimeSeconds: 0,
      }])
      
      const days = getMonthDays(2026, 0, entries, 750)
      const jan15 = days.find(d => d.dayOfMonth === 15 && d.isCurrentMonth)
      
      expect(jan15?.entries).toHaveLength(1)
      expect(jan15?.totalWords).toBe(500)
      expect(jan15?.goalReached).toBe(false)
    })

    it('marks goal reached when total words meet goal', () => {
      const entries = new Map<string, EntryMetadata[]>()
      entries.set('2026-01-15', [{
        id: '1',
        date: '2026-01-15',
        session: 1,
        createdAt: '',
        updatedAt: '',
        wordCount: 800,
        goalReached: true,
        writingTimeSeconds: 0,
      }])
      
      const days = getMonthDays(2026, 0, entries, 750)
      const jan15 = days.find(d => d.dayOfMonth === 15 && d.isCurrentMonth)
      
      expect(jan15?.goalReached).toBe(true)
    })
  })
})
