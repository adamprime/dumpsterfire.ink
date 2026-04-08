import type { EntryMetadata, DumpsterFireSettings } from '../../types/filesystem'
import type { TotalStats } from '../stats'
import type { EntryStorage } from './types'
import { generateEntryId, parseDateFromEntryId } from './types'

const DEFAULT_SETTINGS: DumpsterFireSettings = {
  version: '1.0.0',
  security: { mode: 'open' },
  ai: { provider: null, autoAnalyze: false },
  editor: { fontSize: 18, lineHeight: 1.6, maxWidth: 'medium', fontFamily: 'theme' },
  goals: { dailyWordGoal: 750, showProgressBar: true },
}

export class OpfsStorage implements EntryStorage {
  private root: FileSystemDirectoryHandle | null = null
  private entryIndex: Map<string, EntryMetadata> | null = null

  async initialize(): Promise<void> {
    this.root = await navigator.storage.getDirectory()

    await this.root.getDirectoryHandle('entries', { create: true })

    try {
      await this.root.getFileHandle('settings.json')
    } catch {
      await this.writeFile(this.root, 'settings.json', JSON.stringify(DEFAULT_SETTINGS, null, 2))
    }

    // Request persistent storage (best-effort, may prompt in Firefox)
    if (navigator.storage?.persist) {
      await navigator.storage.persist()
    }

    await this.rebuildIndex()
  }

  async listEntries(): Promise<EntryMetadata[]> {
    if (!this.entryIndex) await this.rebuildIndex()
    return Array.from(this.entryIndex!.values())
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  async loadEntry(id: string): Promise<{ content: string; meta: EntryMetadata } | null> {
    try {
      const dir = await this.resolveEntryDir(id)
      const content = await this.readFile(dir, `${id}.md`)
      const metaStr = await this.readFile(dir, `${id}.meta.json`)
      return { content, meta: JSON.parse(metaStr) }
    } catch {
      return null
    }
  }

  async loadEntryContent(id: string): Promise<string | null> {
    try {
      const dir = await this.resolveEntryDir(id)
      return await this.readFile(dir, `${id}.md`)
    } catch {
      return null
    }
  }

  async saveEntry(id: string, content: string, meta: EntryMetadata): Promise<void> {
    const dir = await this.ensureEntryDir(id)
    await this.writeFile(dir, `${id}.md`, content)
    await this.writeFile(dir, `${id}.meta.json`, JSON.stringify(meta, null, 2))
    this.entryIndex?.set(id, meta)
  }

  async saveEntryMetadata(id: string, meta: EntryMetadata): Promise<void> {
    const dir = await this.resolveEntryDir(id)
    await this.writeFile(dir, `${id}.meta.json`, JSON.stringify(meta, null, 2))
    this.entryIndex?.set(id, meta)
  }

  async createEntry(date: string): Promise<{ id: string; meta: EntryMetadata }> {
    const id = generateEntryId()

    // Compute session number from existing same-day entries
    let sessionCount = 0
    if (this.entryIndex) {
      for (const meta of this.entryIndex.values()) {
        if (meta.date === date) sessionCount++
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

    await this.saveEntry(id, '', meta)
    return { id, meta }
  }

  async deleteEntry(id: string): Promise<void> {
    try {
      const dir = await this.resolveEntryDir(id)
      await dir.removeEntry(`${id}.md`)
      await dir.removeEntry(`${id}.meta.json`)
      this.entryIndex?.delete(id)
    } catch {
      // Entry doesn't exist, no-op
    }
  }

  async getSettings(): Promise<DumpsterFireSettings> {
    try {
      const content = await this.readFile(this.getRoot(), 'settings.json')
      return JSON.parse(content)
    } catch {
      return structuredClone(DEFAULT_SETTINGS)
    }
  }

  async saveSettings(settings: DumpsterFireSettings): Promise<void> {
    await this.writeFile(this.getRoot(), 'settings.json', JSON.stringify(settings, null, 2))
  }

  async getStats(): Promise<TotalStats | null> {
    try {
      const content = await this.readFile(this.getRoot(), 'stats.json')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  async saveStats(stats: TotalStats): Promise<void> {
    await this.writeFile(this.getRoot(), 'stats.json', JSON.stringify(stats, null, 2))
  }

  // -- Private helpers --

  private getRoot(): FileSystemDirectoryHandle {
    if (!this.root) throw new Error('OpfsStorage not initialized')
    return this.root
  }

  private async rebuildIndex(): Promise<void> {
    this.entryIndex = new Map()
    const root = this.getRoot()

    try {
      const entriesDir = await root.getDirectoryHandle('entries')

      for await (const [, yearHandle] of entriesDir.entries()) {
        if (yearHandle.kind !== 'directory') continue
        const yearDir = yearHandle as FileSystemDirectoryHandle

        for await (const [, monthHandle] of yearDir.entries()) {
          if (monthHandle.kind !== 'directory') continue
          const monthDir = monthHandle as FileSystemDirectoryHandle

          for await (const [fileName] of monthDir.entries()) {
            if (fileName.endsWith('.meta.json')) {
              try {
                const metaStr = await this.readFile(monthDir, fileName)
                const meta: EntryMetadata = JSON.parse(metaStr)
                const id = fileName.replace('.meta.json', '')
                this.entryIndex.set(id, meta)
              } catch {
                // Skip invalid files
              }
            }
          }
        }
      }
    } catch {
      // entries directory doesn't exist yet
    }
  }

  private async resolveEntryDir(id: string): Promise<FileSystemDirectoryHandle> {
    const date = parseDateFromEntryId(id)
    const [year, month] = date.split('-')
    const entriesDir = await this.getRoot().getDirectoryHandle('entries')
    const yearDir = await entriesDir.getDirectoryHandle(year!)
    return await yearDir.getDirectoryHandle(month!)
  }

  private async ensureEntryDir(id: string): Promise<FileSystemDirectoryHandle> {
    const date = parseDateFromEntryId(id)
    const [year, month] = date.split('-')
    const entriesDir = await this.getRoot().getDirectoryHandle('entries', { create: true })
    const yearDir = await entriesDir.getDirectoryHandle(year!, { create: true })
    return await yearDir.getDirectoryHandle(month!, { create: true })
  }

  private async readFile(dir: FileSystemDirectoryHandle, name: string): Promise<string> {
    const handle = await dir.getFileHandle(name)
    const file = await handle.getFile()
    return await file.text()
  }

  private async writeFile(dir: FileSystemDirectoryHandle, name: string, content: string): Promise<void> {
    const handle = await dir.getFileHandle(name, { create: true })
    const writable = await handle.createWritable()
    await writable.write(content)
    await writable.close()
  }
}
