import { describe, it, expect } from 'vitest'
import { generateDeviceId, daysUntilExpiration } from './pat-store'

describe('pat-store utilities', () => {
  describe('generateDeviceId', () => {
    it('generates a 4-character alphanumeric string', () => {
      const id = generateDeviceId()
      expect(id).toHaveLength(4)
      expect(id).toMatch(/^[a-z0-9]+$/)
    })

    it('generates unique ids', () => {
      const ids = new Set(Array.from({ length: 50 }, () => generateDeviceId()))
      expect(ids.size).toBeGreaterThan(40)
    })
  })

  describe('daysUntilExpiration', () => {
    it('returns null for null input', () => {
      expect(daysUntilExpiration(null)).toBeNull()
    })

    it('returns positive days for future date', () => {
      const future = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      const days = daysUntilExpiration(future)
      expect(days).toBe(14)
    })

    it('returns negative days for past date', () => {
      const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      const days = daysUntilExpiration(past)
      expect(days).toBeLessThanOrEqual(-1)
    })

    it('returns 1 for tomorrow', () => {
      const tomorrow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
      expect(daysUntilExpiration(tomorrow)).toBe(1)
    })
  })
})
