import type { EntryMetadata, DumpsterFireSettings } from '../../types/filesystem'
import type { TotalStats } from '../stats'
import type { EntryStorage } from './types'
import { entryId } from './types'

const DEFAULT_SETTINGS: DumpsterFireSettings = {
  version: '1.0.0',
  security: { mode: 'open' },
  ai: { provider: null, autoAnalyze: false },
  editor: { fontSize: 18, lineHeight: 1.6, maxWidth: 'medium', fontFamily: 'theme' },
  goals: { dailyWordGoal: 750, showProgressBar: true },
}

export class FsaStorage implements EntryStorage {
  constructor(private handle: FileSystemDirectoryHandle) {}

  async initialize(): Promise<void> {
    try {
      await this.handle.getDirectoryHandle('entries', { create: true })
    } catch {
      // Directory may already exist
    }

    try {
      await this.handle.getFileHandle('settings.json')
    } catch {
      const settingsFile = await this.handle.getFileHandle('settings.json', { create: true })
      const writable = await settingsFile.createWritable()
      await writable.write(JSON.stringify(DEFAULT_SETTINGS, null, 2))
      await writable.close()
    }
  }

  async listEntries(): Promise<EntryMetadata[]> {
    const entries: EntryMetadata[] = []

    try {
      const entriesDir = await this.handle.getDirectoryHandle('entries')

      for await (const [, yearHandle] of entriesDir.entries()) {
        if (yearHandle.kind !== 'directory') continue
        const yearDir = yearHandle as FileSystemDirectoryHandle

        for await (const [, monthHandle] of yearDir.entries()) {
          if (monthHandle.kind !== 'directory') continue
          const monthDir = monthHandle as FileSystemDirectoryHandle

          for await (const [fileName] of monthDir.entries()) {
            if (fileName.endsWith('.meta.json')) {
              try {
                const metaFile = await monthDir.getFileHandle(fileName)
                const file = await metaFile.getFile()
                const content = await file.text()
                entries.push(JSON.parse(content))
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

    return entries.sort((a, b) => b.date.localeCompare(a.date))
  }

  async loadEntry(id: string): Promise<{ content: string; meta: EntryMetadata } | null> {
    try {
      const { monthDir, baseName } = await this.resolveEntryPath(id)

      const mdFile = await monthDir.getFileHandle(`${baseName}.md`)
      const content = await (await mdFile.getFile()).text()

      const metaFile = await monthDir.getFileHandle(`${baseName}.meta.json`)
      const meta: EntryMetadata = JSON.parse(await (await metaFile.getFile()).text())

      return { content, meta }
    } catch {
      return null
    }
  }

  async loadEntryContent(id: string): Promise<string | null> {
    try {
      const { monthDir, baseName } = await this.resolveEntryPath(id)
      const mdFile = await monthDir.getFileHandle(`${baseName}.md`)
      return await (await mdFile.getFile()).text()
    } catch {
      return null
    }
  }

  async saveEntry(id: string, content: string, meta: EntryMetadata): Promise<void> {
    const { monthDir, baseName } = await this.ensureEntryPath(id)

    const mdFile = await monthDir.getFileHandle(`${baseName}.md`, { create: true })
    const mdWritable = await mdFile.createWritable()
    await mdWritable.write(content)
    await mdWritable.close()

    const metaFile = await monthDir.getFileHandle(`${baseName}.meta.json`, { create: true })
    const metaWritable = await metaFile.createWritable()
    await metaWritable.write(JSON.stringify(meta, null, 2))
    await metaWritable.close()
  }

  async saveEntryMetadata(id: string, meta: EntryMetadata): Promise<void> {
    const { monthDir, baseName } = await this.resolveEntryPath(id)
    const metaFile = await monthDir.getFileHandle(`${baseName}.meta.json`, { create: true })
    const metaWritable = await metaFile.createWritable()
    await metaWritable.write(JSON.stringify(meta, null, 2))
    await metaWritable.close()
  }

  async createEntry(date: string): Promise<{ id: string; meta: EntryMetadata }> {
    const [year, month] = date.split('-')
    const entriesDir = await this.handle.getDirectoryHandle('entries', { create: true })
    const yearDir = await entriesDir.getDirectoryHandle(year!, { create: true })
    const monthDir = await yearDir.getDirectoryHandle(month!, { create: true })

    let maxSession = 0
    for await (const [name] of monthDir.entries()) {
      if (name.startsWith(date) && name.endsWith('.md')) {
        const match = name.match(/-(\d+)\.md$/)
        if (match?.[1]) {
          maxSession = Math.max(maxSession, parseInt(match[1], 10))
        }
      }
    }

    const session = maxSession + 1
    const id = entryId(date, session)

    const meta: EntryMetadata = {
      id: crypto.randomUUID(),
      date,
      session,
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
      const { monthDir, baseName } = await this.resolveEntryPath(id)
      await monthDir.removeEntry(`${baseName}.md`)
      await monthDir.removeEntry(`${baseName}.meta.json`)
    } catch {
      // Entry doesn't exist, no-op
    }
  }

  async getSettings(): Promise<DumpsterFireSettings> {
    try {
      const settingsFile = await this.handle.getFileHandle('settings.json')
      const file = await settingsFile.getFile()
      const content = await file.text()
      return JSON.parse(content)
    } catch {
      return structuredClone(DEFAULT_SETTINGS)
    }
  }

  async saveSettings(settings: DumpsterFireSettings): Promise<void> {
    const settingsFile = await this.handle.getFileHandle('settings.json', { create: true })
    const writable = await settingsFile.createWritable()
    await writable.write(JSON.stringify(settings, null, 2))
    await writable.close()
  }

  async getStats(): Promise<TotalStats | null> {
    try {
      const statsFile = await this.handle.getFileHandle('stats.json')
      const file = await statsFile.getFile()
      const content = await file.text()
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  async saveStats(stats: TotalStats): Promise<void> {
    const statsFile = await this.handle.getFileHandle('stats.json', { create: true })
    const writable = await statsFile.createWritable()
    await writable.write(JSON.stringify(stats, null, 2))
    await writable.close()
  }

  private async resolveEntryPath(id: string): Promise<{ monthDir: FileSystemDirectoryHandle; baseName: string }> {
    const parts = id.split('-')
    const year = parts[0]!
    const month = parts[1]!
    const baseName = id

    const entriesDir = await this.handle.getDirectoryHandle('entries')
    const yearDir = await entriesDir.getDirectoryHandle(year)
    const monthDir = await yearDir.getDirectoryHandle(month)

    return { monthDir, baseName }
  }

  private async ensureEntryPath(id: string): Promise<{ monthDir: FileSystemDirectoryHandle; baseName: string }> {
    const parts = id.split('-')
    const year = parts[0]!
    const month = parts[1]!
    const baseName = id

    const entriesDir = await this.handle.getDirectoryHandle('entries', { create: true })
    const yearDir = await entriesDir.getDirectoryHandle(year, { create: true })
    const monthDir = await yearDir.getDirectoryHandle(month, { create: true })

    return { monthDir, baseName }
  }
}
