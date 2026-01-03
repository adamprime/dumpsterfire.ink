import type { EntryMetadata } from '../types/filesystem'

export interface EntryWithPreview extends EntryMetadata {
  preview: string
}

export async function getAllEntries(
  handle: FileSystemDirectoryHandle
): Promise<EntryWithPreview[]> {
  const entries: EntryWithPreview[] = []
  
  try {
    const entriesDir = await handle.getDirectoryHandle('entries')
    
    // Iterate through years
    for await (const [yearName, yearHandle] of entriesDir.entries()) {
      if (yearHandle.kind !== 'directory') continue
      
      const yearDir = await entriesDir.getDirectoryHandle(yearName)
      
      // Iterate through months
      for await (const [monthName, monthHandle] of yearDir.entries()) {
        if (monthHandle.kind !== 'directory') continue
        
        const monthDir = await yearDir.getDirectoryHandle(monthName)
        
        // Load entries from this month
        for await (const [fileName] of monthDir.entries()) {
          if (!fileName.endsWith('.meta.json')) continue
          
          try {
            const metaFile = await monthDir.getFileHandle(fileName)
            const metaContent = await (await metaFile.getFile()).text()
            const metadata: EntryMetadata = JSON.parse(metaContent)
            
            // Load preview from markdown file
            const mdFileName = fileName.replace('.meta.json', '.md')
            let preview = ''
            try {
              const mdFile = await monthDir.getFileHandle(mdFileName)
              const mdContent = await (await mdFile.getFile()).text()
              preview = getPreview(mdContent, 100)
            } catch {
              // No markdown file found
            }
            
            entries.push({ ...metadata, preview })
          } catch {
            // Skip invalid files
          }
        }
      }
    }
  } catch {
    // Entries directory doesn't exist
  }
  
  // Sort by date descending, then by session descending
  return entries.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    return b.session - a.session
  })
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
  return entries.filter((entry) => {
    return (
      entry.preview.toLowerCase().includes(lowerQuery) ||
      entry.date.includes(lowerQuery)
    )
  })
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
