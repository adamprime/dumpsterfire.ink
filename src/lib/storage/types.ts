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

export function generateEntryId(date: Date = new Date()): string {
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  const ms = String(date.getMilliseconds()).padStart(3, '0')
  return `${y}-${mo}-${d}-${h}${mi}${s}${ms}`
}

export function parseDateFromEntryId(id: string): string {
  // "2026-04-08-143211" -> "2026-04-08"
  return id.slice(0, 10)
}

