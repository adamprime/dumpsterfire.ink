import { describe, it, expect } from 'vitest'
import { getPreview, searchEntries, formatEntryDate } from './entries'
import type { EntryWithPreview } from './entries'

describe('entries utilities', () => {
  describe('getPreview', () => {
    it('returns full content if under word limit', () => {
      const content = 'Hello world this is short'
      expect(getPreview(content, 100)).toBe('Hello world this is short')
    })

    it('truncates content at word limit with ellipsis', () => {
      const content = 'One two three four five six seven eight nine ten eleven twelve'
      expect(getPreview(content, 5)).toBe('One two three four five...')
    })

    it('handles empty string', () => {
      expect(getPreview('', 100)).toBe('')
    })

    it('trims whitespace', () => {
      expect(getPreview('  hello world  ', 100)).toBe('hello world')
    })
  })

  describe('searchEntries', () => {
    const mockEntries: EntryWithPreview[] = [
      {
        id: '1',
        date: '2026-01-15',
        session: 1,
        createdAt: '',
        updatedAt: '',
        wordCount: 100,
        goalReached: false,
        writingTimeSeconds: 0,
        preview: 'Today I wrote about programming and React',
      },
      {
        id: '2',
        date: '2026-01-14',
        session: 1,
        createdAt: '',
        updatedAt: '',
        wordCount: 200,
        goalReached: true,
        writingTimeSeconds: 0,
        preview: 'Thinking about the future and my goals',
      },
    ]

    it('returns all entries for empty query', () => {
      expect(searchEntries(mockEntries, '')).toHaveLength(2)
      expect(searchEntries(mockEntries, '  ')).toHaveLength(2)
    })

    it('filters by preview content', () => {
      const results = searchEntries(mockEntries, 'programming')
      expect(results).toHaveLength(1)
      expect(results[0]?.id).toBe('1')
    })

    it('filters by date', () => {
      const results = searchEntries(mockEntries, '2026-01-14')
      expect(results).toHaveLength(1)
      expect(results[0]?.id).toBe('2')
    })

    it('is case insensitive', () => {
      expect(searchEntries(mockEntries, 'REACT')).toHaveLength(1)
      expect(searchEntries(mockEntries, 'react')).toHaveLength(1)
    })
  })

  describe('formatEntryDate', () => {
    it('formats date string nicely', () => {
      const formatted = formatEntryDate('2026-01-15')
      expect(formatted).toContain('Jan')
      expect(formatted).toContain('15')
      expect(formatted).toContain('2026')
    })
  })
})
