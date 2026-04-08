import type { EntryMetadata } from '../types/filesystem'
import type { EntryStorage } from './storage/types'
import { entryId, parseEntryId } from './storage/types'

export interface EntryWithPreview extends EntryMetadata {
  preview: string
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getPreview(content: string, wordCount: number): string {
  const words = content.trim().split(/\s+/).filter(Boolean)
  if (words.length <= wordCount) {
    return content.trim()
  }
  return words.slice(0, wordCount).join(' ') + '...'
}

export function searchEntries(
  entries: EntryWithPreview[],
  query: string
): EntryWithPreview[] {
  if (!query.trim()) return entries
  const lowerQuery = query.toLowerCase()
  return entries.filter((entry) =>
    entry.preview.toLowerCase().includes(lowerQuery) ||
    entry.date.includes(lowerQuery)
  )
}

export function formatEntryDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export async function getOrCreateTodayEntry(
  storage: EntryStorage,
  date: Date = new Date()
): Promise<{ id: string; content: string; meta: EntryMetadata }> {
  const dateStr = formatDate(date)
  const entries = await storage.listEntries()
  const todayEntries = entries
    .filter((e) => e.date === dateStr)
    .sort((a, b) => a.session - b.session)

  if (todayEntries.length > 0) {
    const latest = todayEntries[todayEntries.length - 1]!
    const id = entryId(latest.date, latest.session)
    const loaded = await storage.loadEntry(id)
    if (loaded) {
      return { id, content: loaded.content, meta: loaded.meta }
    }
  }

  const { id, meta } = await storage.createEntry(dateStr)
  return { id, content: '', meta }
}

export async function getTodaySessions(
  storage: EntryStorage,
  date: Date = new Date()
): Promise<EntryMetadata[]> {
  const dateStr = formatDate(date)
  const entries = await storage.listEntries()
  return entries
    .filter((e) => e.date === dateStr)
    .sort((a, b) => a.session - b.session)
}

export async function loadEntriesWithPreviews(
  storage: EntryStorage
): Promise<EntryWithPreview[]> {
  const entries = await storage.listEntries()
  const result: EntryWithPreview[] = []

  for (const meta of entries) {
    const id = entryId(meta.date, meta.session)
    const content = await storage.loadEntryContent(id)
    result.push({
      ...meta,
      preview: content ? getPreview(content, 100) : '',
    })
  }

  return result.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    return b.session - a.session
  })
}

export function filterEntriesByMonth(
  entries: EntryMetadata[],
  year: number,
  month: number
): Map<string, EntryMetadata[]> {
  const result = new Map<string, EntryMetadata[]>()
  const monthStr = String(month + 1).padStart(2, '0')
  const yearStr = String(year)

  for (const entry of entries) {
    const [entryYear, entryMonth] = entry.date.split('-')
    if (entryYear === yearStr && entryMonth === monthStr) {
      const existing = result.get(entry.date) || []
      existing.push(entry)
      result.set(entry.date, existing.sort((a, b) => a.session - b.session))
    }
  }

  return result
}

export { entryId, parseEntryId }
