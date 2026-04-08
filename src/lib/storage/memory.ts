import type { EntryMetadata, DumpsterFireSettings } from '../../types/filesystem'
import type { TotalStats } from '../stats'
import type { EntryStorage } from './types'
import { generateEntryId } from './types'

const DEFAULT_SETTINGS: DumpsterFireSettings = {
  version: '1.0.0',
  security: { mode: 'open' },
  ai: { provider: null, autoAnalyze: false },
  editor: { fontSize: 18, lineHeight: 1.6, maxWidth: 'medium', fontFamily: 'theme' },
  goals: { dailyWordGoal: 750, showProgressBar: true },
}

export class MemoryStorage implements EntryStorage {
  private entries = new Map<string, { content: string; meta: EntryMetadata }>()
  private settings: DumpsterFireSettings = structuredClone(DEFAULT_SETTINGS)
  private stats: TotalStats | null = null

  async initialize(): Promise<void> {
    // No-op for memory storage
  }

  async listEntries(): Promise<EntryMetadata[]> {
    return Array.from(this.entries.values())
      .map((e) => e.meta)
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  async loadEntry(id: string): Promise<{ content: string; meta: EntryMetadata } | null> {
    return this.entries.get(id) ?? null
  }

  async loadEntryContent(id: string): Promise<string | null> {
    return this.entries.get(id)?.content ?? null
  }

  async saveEntry(id: string, content: string, meta: EntryMetadata): Promise<void> {
    this.entries.set(id, { content, meta })
  }

  async saveEntryMetadata(id: string, meta: EntryMetadata): Promise<void> {
    const existing = this.entries.get(id)
    if (existing) {
      this.entries.set(id, { ...existing, meta })
    }
  }

  async createEntry(date: string): Promise<{ id: string; meta: EntryMetadata }> {
    let id = generateEntryId()
    while (this.entries.has(id)) {
      // Collision within same millisecond -- bump by 1ms
      const parsed = id.slice(11) // HHMMSSmmm
      const ms = parseInt(parsed.slice(6), 10) + 1
      id = id.slice(0, 17) + String(ms).padStart(3, '0')
    }

    // Compute session number as count of same-day entries + 1
    let sessionCount = 0
    for (const entry of this.entries.values()) {
      if (entry.meta.date === date) {
        sessionCount++
      }
    }

    const meta: EntryMetadata = {
      id,
      date,
      session: sessionCount + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: 0,
      goalReached: false,
      writingTimeSeconds: 0,
    }

    this.entries.set(id, { content: '', meta })
    return { id, meta }
  }

  async deleteEntry(id: string): Promise<void> {
    this.entries.delete(id)
  }

  async getSettings(): Promise<DumpsterFireSettings> {
    return structuredClone(this.settings)
  }

  async saveSettings(settings: DumpsterFireSettings): Promise<void> {
    this.settings = structuredClone(settings)
  }

  async getStats(): Promise<TotalStats | null> {
    return this.stats ? { ...this.stats } : null
  }

  async saveStats(stats: TotalStats): Promise<void> {
    this.stats = { ...stats }
  }
}
