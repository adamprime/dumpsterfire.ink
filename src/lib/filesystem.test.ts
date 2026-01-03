import { describe, it, expect } from 'vitest'
import { countWords, formatDate } from './filesystem'

describe('countWords', () => {
  it('counts words in a simple string', () => {
    expect(countWords('hello world')).toBe(2)
  })

  it('handles empty string', () => {
    expect(countWords('')).toBe(0)
  })

  it('handles whitespace only', () => {
    expect(countWords('   \n\t  ')).toBe(0)
  })

  it('handles multiple spaces between words', () => {
    expect(countWords('hello    world')).toBe(2)
  })

  it('handles newlines and tabs', () => {
    expect(countWords('hello\nworld\ttest')).toBe(3)
  })

  it('counts words in longer text', () => {
    const text = 'The quick brown fox jumps over the lazy dog'
    expect(countWords(text)).toBe(9)
  })
})

describe('formatDate', () => {
  it('formats date as YYYY-MM-DD', () => {
    const date = new Date(2026, 0, 15) // Jan 15, 2026
    expect(formatDate(date)).toBe('2026-01-15')
  })

  it('pads single digit month and day', () => {
    const date = new Date(2026, 2, 5) // Mar 5, 2026
    expect(formatDate(date)).toBe('2026-03-05')
  })

  it('handles December correctly', () => {
    const date = new Date(2026, 11, 25) // Dec 25, 2026
    expect(formatDate(date)).toBe('2026-12-25')
  })
})
