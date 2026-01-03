import type { EntryMetadata, DumpsterFireSettings } from '../types/filesystem'

const DEFAULT_SETTINGS: DumpsterFireSettings = {
  version: '1.0.0',
  security: { mode: 'open' },
  ai: { provider: null, autoAnalyze: false },
  editor: { fontSize: 18, lineHeight: 1.6, maxWidth: 'medium', fontFamily: 'theme' },
  goals: { dailyWordGoal: 750, showProgressBar: true },
}

export async function initializeFolder(
  handle: FileSystemDirectoryHandle
): Promise<void> {
  try {
    await handle.getDirectoryHandle('entries', { create: true })
  } catch {
    // Directory may already exist
  }

  try {
    await handle.getFileHandle('settings.json')
  } catch {
    const settingsFile = await handle.getFileHandle('settings.json', { create: true })
    const writable = await settingsFile.createWritable()
    await writable.write(JSON.stringify(DEFAULT_SETTINGS, null, 2))
    await writable.close()
  }
}

export async function getSettings(
  handle: FileSystemDirectoryHandle
): Promise<DumpsterFireSettings> {
  try {
    const settingsFile = await handle.getFileHandle('settings.json')
    const file = await settingsFile.getFile()
    const content = await file.text()
    return JSON.parse(content)
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function saveSettings(
  handle: FileSystemDirectoryHandle,
  settings: DumpsterFireSettings
): Promise<void> {
  const settingsFile = await handle.getFileHandle('settings.json', { create: true })
  const writable = await settingsFile.createWritable()
  await writable.write(JSON.stringify(settings, null, 2))
  await writable.close()
}

function getEntryPath(date: Date, session: number): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${year}-${month}-${day}-${session}`
}

export async function getOrCreateEntry(
  handle: FileSystemDirectoryHandle,
  date: Date = new Date()
): Promise<{ content: string; metadata: EntryMetadata; path: string }> {
  const entriesDir = await handle.getDirectoryHandle('entries', { create: true })
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`

  const yearDir = await entriesDir.getDirectoryHandle(year, { create: true })
  const monthDir = await yearDir.getDirectoryHandle(month, { create: true })

  // Find existing sessions for today or create new one
  let session = 1
  const existingSessions: number[] = []

  for await (const [name] of monthDir.entries()) {
    if (name.startsWith(dateStr) && name.endsWith('.md')) {
      const match = name.match(/-(\d+)\.md$/)
      if (match?.[1]) {
        existingSessions.push(parseInt(match[1], 10))
      }
    }
  }

  if (existingSessions.length > 0) {
    session = Math.max(...existingSessions)
  }

  const baseName = `${dateStr}-${session}`
  const mdPath = `${baseName}.md`
  const metaPath = `${baseName}.meta.json`

  let content = ''
  let metadata: EntryMetadata

  try {
    const mdFile = await monthDir.getFileHandle(mdPath)
    const file = await mdFile.getFile()
    content = await file.text()

    const metaFile = await monthDir.getFileHandle(metaPath)
    const metaContent = await (await metaFile.getFile()).text()
    metadata = JSON.parse(metaContent)
  } catch {
    // Create new entry
    metadata = {
      id: crypto.randomUUID(),
      date: dateStr,
      session,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: 0,
      goalReached: false,
      writingTimeSeconds: 0,
    }

    await saveEntry(handle, date, session, content, metadata)
  }

  return { content, metadata, path: getEntryPath(date, session) }
}

export async function saveEntry(
  handle: FileSystemDirectoryHandle,
  date: Date,
  session: number,
  content: string,
  metadata: EntryMetadata
): Promise<void> {
  const entriesDir = await handle.getDirectoryHandle('entries', { create: true })
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`

  const yearDir = await entriesDir.getDirectoryHandle(year, { create: true })
  const monthDir = await yearDir.getDirectoryHandle(month, { create: true })

  const baseName = `${dateStr}-${session}`

  const mdFile = await monthDir.getFileHandle(`${baseName}.md`, { create: true })
  const mdWritable = await mdFile.createWritable()
  await mdWritable.write(content)
  await mdWritable.close()

  const metaFile = await monthDir.getFileHandle(`${baseName}.meta.json`, { create: true })
  const metaWritable = await metaFile.createWritable()
  await metaWritable.write(JSON.stringify(metadata, null, 2))
  await metaWritable.close()
}

export async function createNewSession(
  handle: FileSystemDirectoryHandle,
  date: Date = new Date()
): Promise<{ content: string; metadata: EntryMetadata; path: string }> {
  const entriesDir = await handle.getDirectoryHandle('entries', { create: true })
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`

  const yearDir = await entriesDir.getDirectoryHandle(year, { create: true })
  const monthDir = await yearDir.getDirectoryHandle(month, { create: true })

  let maxSession = 0
  for await (const [name] of monthDir.entries()) {
    if (name.startsWith(dateStr) && name.endsWith('.md')) {
      const match = name.match(/-(\d+)\.md$/)
      if (match?.[1]) {
        maxSession = Math.max(maxSession, parseInt(match[1], 10))
      }
    }
  }

  const session = maxSession + 1
  const content = ''
  const metadata: EntryMetadata = {
    id: crypto.randomUUID(),
    date: dateStr,
    session,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    wordCount: 0,
    goalReached: false,
    writingTimeSeconds: 0,
  }

  await saveEntry(handle, date, session, content, metadata)

  return { content, metadata, path: getEntryPath(date, session) }
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

export async function getTodaySessions(
  handle: FileSystemDirectoryHandle,
  date: Date = new Date()
): Promise<EntryMetadata[]> {
  const dateStr = formatDate(date)
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')

  try {
    const entriesDir = await handle.getDirectoryHandle('entries')
    const yearDir = await entriesDir.getDirectoryHandle(year)
    const monthDir = await yearDir.getDirectoryHandle(month)

    const sessions: EntryMetadata[] = []

    for await (const [name] of monthDir.entries()) {
      if (name.startsWith(dateStr) && name.endsWith('.meta.json')) {
        try {
          const metaFile = await monthDir.getFileHandle(name)
          const file = await metaFile.getFile()
          const content = await file.text()
          sessions.push(JSON.parse(content))
        } catch {
          // Skip invalid metadata files
        }
      }
    }

    return sessions.sort((a, b) => a.session - b.session)
  } catch {
    return []
  }
}

export async function loadSession(
  handle: FileSystemDirectoryHandle,
  date: Date,
  session: number
): Promise<{ content: string; metadata: EntryMetadata }> {
  const dateStr = formatDate(date)
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const baseName = `${dateStr}-${session}`

  const entriesDir = await handle.getDirectoryHandle('entries')
  const yearDir = await entriesDir.getDirectoryHandle(year)
  const monthDir = await yearDir.getDirectoryHandle(month)

  const mdFile = await monthDir.getFileHandle(`${baseName}.md`)
  const content = await (await mdFile.getFile()).text()

  const metaFile = await monthDir.getFileHandle(`${baseName}.meta.json`)
  const metadata: EntryMetadata = JSON.parse(await (await metaFile.getFile()).text())

  return { content, metadata }
}
