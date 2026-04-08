import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStorage } from './memory'
import type { EntryStorage } from './types'
import { entryId, parseEntryId } from './types'

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
        expect(id).toBe(entryId('2026-01-15', 1))
      })

      it('increments session number for the same date', async () => {
        await storage.createEntry('2026-01-15')
        const { id, meta } = await storage.createEntry('2026-01-15')
        expect(meta.session).toBe(2)
        expect(id).toBe(entryId('2026-01-15', 2))
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
        const loaded = await storage.loadEntry('2099-12-31-1')
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
        const content = await storage.loadEntryContent('2099-12-31-1')
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
        await expect(storage.deleteEntry('2099-12-31-1')).resolves.not.toThrow()
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

describe('entryId / parseEntryId', () => {
  it('creates an id from date and session', () => {
    expect(entryId('2026-01-15', 1)).toBe('2026-01-15-1')
    expect(entryId('2026-01-15', 3)).toBe('2026-01-15-3')
  })

  it('parses an id back to date and session', () => {
    expect(parseEntryId('2026-01-15-1')).toEqual({ date: '2026-01-15', session: 1 })
    expect(parseEntryId('2026-01-15-3')).toEqual({ date: '2026-01-15', session: 3 })
  })

  it('roundtrips correctly', () => {
    const id = entryId('2026-12-31', 7)
    const parsed = parseEntryId(id)
    expect(parsed).toEqual({ date: '2026-12-31', session: 7 })
    expect(entryId(parsed.date, parsed.session)).toBe(id)
  })
})
