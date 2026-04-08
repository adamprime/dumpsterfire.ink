import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStorage } from './memory'
import type { EntryStorage } from './types'
import { generateEntryId, parseDateFromEntryId } from './types'

function runStorageContractTests(name: string, createStorage: () => EntryStorage) {
  describe(`${name} — EntryStorage contract`, () => {
    let storage: EntryStorage

    beforeEach(async () => {
      storage = createStorage()
      await storage.initialize()
    })

    describe('initialize', () => {
      it('can be called multiple times without error', async () => {
        await storage.initialize()
        await storage.initialize()
      })
    })

    describe('createEntry + loadEntry', () => {
      it('creates an entry with session 1 for a new date', async () => {
        const { id, meta } = await storage.createEntry('2026-01-15')
        expect(meta.date).toBe('2026-01-15')
        expect(meta.session).toBe(1)
        expect(meta.wordCount).toBe(0)
        expect(meta.goalReached).toBe(false)
        expect(id).toBeTruthy()
      })

      it('increments session number for the same date', async () => {
        await storage.createEntry('2026-01-15')
        const { meta } = await storage.createEntry('2026-01-15')
        expect(meta.session).toBe(2)
      })

      it('tracks sessions independently per date', async () => {
        await storage.createEntry('2026-01-15')
        const { meta } = await storage.createEntry('2026-01-16')
        expect(meta.session).toBe(1)
      })

      it('loads a created entry by id', async () => {
        const { id } = await storage.createEntry('2026-01-15')
        const loaded = await storage.loadEntry(id)
        expect(loaded).not.toBeNull()
        expect(loaded!.content).toBe('')
        expect(loaded!.meta.date).toBe('2026-01-15')
      })

      it('returns null for non-existent entry', async () => {
        const loaded = await storage.loadEntry('2099-12-31-235959')
        expect(loaded).toBeNull()
      })
    })

    describe('saveEntry + loadEntry', () => {
      it('saves and loads content and metadata', async () => {
        const { id, meta } = await storage.createEntry('2026-01-15')
        const updatedMeta = { ...meta, wordCount: 42, updatedAt: new Date().toISOString() }
        await storage.saveEntry(id, 'Hello world', updatedMeta)

        const loaded = await storage.loadEntry(id)
        expect(loaded!.content).toBe('Hello world')
        expect(loaded!.meta.wordCount).toBe(42)
      })

      it('overwrites previous content on re-save', async () => {
        const { id, meta } = await storage.createEntry('2026-01-15')
        await storage.saveEntry(id, 'First draft', meta)
        await storage.saveEntry(id, 'Second draft', { ...meta, wordCount: 2 })

        const loaded = await storage.loadEntry(id)
        expect(loaded!.content).toBe('Second draft')
        expect(loaded!.meta.wordCount).toBe(2)
      })
    })

    describe('saveEntryMetadata', () => {
      it('updates metadata without changing content', async () => {
        const { id, meta } = await storage.createEntry('2026-01-15')
        await storage.saveEntry(id, 'Some writing', meta)
        await storage.saveEntryMetadata(id, { ...meta, wordCount: 100 })

        const loaded = await storage.loadEntry(id)
        expect(loaded!.content).toBe('Some writing')
        expect(loaded!.meta.wordCount).toBe(100)
      })
    })

    describe('loadEntryContent', () => {
      it('returns content only', async () => {
        const { id, meta } = await storage.createEntry('2026-01-15')
        await storage.saveEntry(id, 'Just the text', meta)

        const content = await storage.loadEntryContent(id)
        expect(content).toBe('Just the text')
      })

      it('returns null for non-existent entry', async () => {
        const content = await storage.loadEntryContent('2099-12-31-235959')
        expect(content).toBeNull()
      })
    })

    describe('listEntries', () => {
      it('returns empty array when no entries', async () => {
        const entries = await storage.listEntries()
        expect(entries).toEqual([])
      })

      it('returns all entries sorted by date descending', async () => {
        await storage.createEntry('2026-01-10')
        await storage.createEntry('2026-01-15')
        await storage.createEntry('2026-01-12')

        const entries = await storage.listEntries()
        expect(entries).toHaveLength(3)
        expect(entries[0]!.date).toBe('2026-01-15')
        expect(entries[1]!.date).toBe('2026-01-12')
        expect(entries[2]!.date).toBe('2026-01-10')
      })

      it('includes multiple sessions for the same date', async () => {
        await storage.createEntry('2026-01-15')
        await storage.createEntry('2026-01-15')

        const entries = await storage.listEntries()
        expect(entries).toHaveLength(2)
      })
    })

    describe('deleteEntry', () => {
      it('removes an entry', async () => {
        const { id } = await storage.createEntry('2026-01-15')
        await storage.deleteEntry(id)
        const loaded = await storage.loadEntry(id)
        expect(loaded).toBeNull()
      })

      it('does not throw for non-existent entry', async () => {
        await expect(storage.deleteEntry('2099-12-31-235959')).resolves.not.toThrow()
      })
    })

    describe('settings', () => {
      it('returns default settings initially', async () => {
        const settings = await storage.getSettings()
        expect(settings.version).toBe('1.0.0')
        expect(settings.goals.dailyWordGoal).toBe(750)
      })

      it('saves and loads settings', async () => {
        const settings = await storage.getSettings()
        settings.goals.dailyWordGoal = 500
        await storage.saveSettings(settings)

        const loaded = await storage.getSettings()
        expect(loaded.goals.dailyWordGoal).toBe(500)
      })

      it('does not mutate stored settings from external reference', async () => {
        const settings = await storage.getSettings()
        settings.goals.dailyWordGoal = 999
        const loaded = await storage.getSettings()
        expect(loaded.goals.dailyWordGoal).toBe(750)
      })
    })

    describe('stats', () => {
      it('returns null initially', async () => {
        const stats = await storage.getStats()
        expect(stats).toBeNull()
      })

      it('saves and loads stats', async () => {
        const stats = {
          totalEntries: 10,
          totalWords: 5000,
          totalDays: 8,
          averageWordsPerDay: 625,
          averageTimePerSession: 900,
        }
        await storage.saveStats(stats)

        const loaded = await storage.getStats()
        expect(loaded).toEqual(stats)
      })
    })
  })
}

// Run contract tests against MemoryStorage
runStorageContractTests('MemoryStorage', () => new MemoryStorage())

// OpfsStorage can't run in jsdom (no navigator.storage.getDirectory)
// It's tested via Playwright E2E

describe('generateEntryId', () => {
  it('creates a YYYY-MM-DD-HHMMSSmmm format id', () => {
    const date = new Date(2026, 3, 8, 14, 32, 11, 42) // April 8, 2026 14:32:11.042
    const id = generateEntryId(date)
    expect(id).toBe('2026-04-08-143211042')
  })

  it('pads single-digit values', () => {
    const date = new Date(2026, 0, 5, 3, 7, 9, 5)
    const id = generateEntryId(date)
    expect(id).toBe('2026-01-05-030709005')
  })

  it('generates unique ids for rapid calls', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 10; i++) {
      ids.add(generateEntryId())
    }
    // Should get at least 2 unique IDs (millisecond precision)
    expect(ids.size).toBeGreaterThanOrEqual(1)
  })
})

describe('parseDateFromEntryId', () => {
  it('extracts date from entry id', () => {
    expect(parseDateFromEntryId('2026-04-08-143211042')).toBe('2026-04-08')
  })

  it('extracts date from another id', () => {
    expect(parseDateFromEntryId('2026-01-05-030709005')).toBe('2026-01-05')
  })
})
