import type { EntryMetadata } from '../types/filesystem'

export interface DayInfo {
  date: Date
  dayOfMonth: number
  isCurrentMonth: boolean
  isToday: boolean
  entries: EntryMetadata[]
  totalWords: number
  goalReached: boolean
}

export function getMonthDays(year: number, month: number, entries: Map<string, EntryMetadata[]>, wordGoal: number): DayInfo[] {
  const days: DayInfo[] = []
  const today = new Date()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  // Start from Sunday of the week containing the first day
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startDate.getDay())
  
  // End on Saturday of the week containing the last day
  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))
  
  const current = new Date(startDate)
  while (current <= endDate) {
    const dateStr = formatDateKey(current)
    const dayEntries = entries.get(dateStr) || []
    const totalWords = dayEntries.reduce((sum, e) => sum + e.wordCount, 0)
    
    days.push({
      date: new Date(current),
      dayOfMonth: current.getDate(),
      isCurrentMonth: current.getMonth() === month,
      isToday: isSameDay(current, today),
      entries: dayEntries,
      totalWords,
      goalReached: totalWords >= wordGoal,
    })
    
    current.setDate(current.getDate() + 1)
  }
  
  return days
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[month] || ''
}

export async function getEntriesForMonth(
  handle: FileSystemDirectoryHandle,
  year: number,
  month: number
): Promise<Map<string, EntryMetadata[]>> {
  const entries = new Map<string, EntryMetadata[]>()
  const monthStr = String(month + 1).padStart(2, '0')
  
  try {
    const entriesDir = await handle.getDirectoryHandle('entries')
    const yearDir = await entriesDir.getDirectoryHandle(String(year))
    const monthDir = await yearDir.getDirectoryHandle(monthStr)
    
    for await (const [name] of monthDir.entries()) {
      if (name.endsWith('.meta.json')) {
        try {
          const metaFile = await monthDir.getFileHandle(name)
          const file = await metaFile.getFile()
          const content = await file.text()
          const metadata: EntryMetadata = JSON.parse(content)
          
          const existing = entries.get(metadata.date) || []
          existing.push(metadata)
          entries.set(metadata.date, existing.sort((a, b) => a.session - b.session))
        } catch {
          // Skip invalid files
        }
      }
    }
  } catch {
    // Month directory doesn't exist yet
  }
  
  return entries
}
