import type { TotalStats } from '../lib/stats'

interface QuickStatsProps {
  stats: TotalStats
}

export function QuickStats({ stats }: QuickStatsProps) {
  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '0m'
    const mins = Math.floor(seconds / 60)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hours}h ${remainingMins}m`
  }

  const statItems = [
    { label: 'Total Entries', value: stats.totalEntries.toLocaleString() },
    { label: 'Total Words', value: stats.totalWords.toLocaleString() },
    { label: 'Days Written', value: stats.totalDays.toLocaleString() },
    { label: 'Avg Words/Day', value: stats.averageWordsPerDay.toLocaleString() },
    { label: 'Avg Session', value: formatTime(stats.averageTimePerSession) },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {statItems.map((item, i) => (
        <div
          key={i}
          className="p-4 rounded-lg text-center"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <p 
            className="text-2xl font-bold"
            style={{ color: 'var(--color-accent)' }}
          >
            {item.value}
          </p>
          <p 
            className="text-sm mt-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {item.label}
          </p>
        </div>
      ))}
    </div>
  )
}
