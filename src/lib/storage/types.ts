import type { EntryMetadata, DumpsterFireSettings } from '../../types/filesystem'
import type { TotalStats } from '../stats'

export interface EntryStorage {
  initialize(): Promise<void>

  listEntries(): Promise<EntryMetadata[]>
  loadEntry(id: string): Promise<{ content: string; meta: EntryMetadata } | null>
  loadEntryContent(id: string): Promise<string | null>
  saveEntry(id: string, content: string, meta: EntryMetadata): Promise<void>
  saveEntryMetadata(id: string, meta: EntryMetadata): Promise<void>
  createEntry(date: string): Promise<{ id: string; meta: EntryMetadata }>
  deleteEntry(id: string): Promise<void>

  getSettings(): Promise<DumpsterFireSettings>
  saveSettings(settings: DumpsterFireSettings): Promise<void>

  getStats(): Promise<TotalStats | null>
  saveStats(stats: TotalStats): Promise<void>
}

export function entryId(date: string, session: number): string {
  return `${date}-${session}`
}

export function parseEntryId(id: string): { date: string; session: number } {
  const lastDash = id.lastIndexOf('-')
  return {
    date: id.slice(0, lastDash),
    session: parseInt(id.slice(lastDash + 1), 10),
  }
}
