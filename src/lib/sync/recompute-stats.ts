import type { EntryStorage } from '../storage/types'
import { calculateTotalStats } from '../stats'

/**
 * Recompute stats.json from entries after a git pull.
 * stats.json is treated as a cache -- never merged, always recomputed.
 */
export function createStatsRecomputer(storage: EntryStorage) {
  return async () => {
    const entries = await storage.listEntries()
    const stats = calculateTotalStats(entries)
    await storage.saveStats(stats)
  }
}
