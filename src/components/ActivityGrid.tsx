interface ActivityGridProps {
  activity: Map<number, number>
  year: number
  month: number // 0-indexed
  wordGoal: number
}

export function ActivityGrid({ activity, year, month, wordGoal }: ActivityGridProps) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  
  const days: (number | null)[] = []
  
  // Add empty cells for days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null)
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day)
  }

  const getIntensity = (words: number): number => {
    if (words === 0) return 0
    if (words < wordGoal * 0.25) return 1
    if (words < wordGoal * 0.5) return 2
    if (words < wordGoal) return 3
    return 4 // Goal reached
  }

  const getIntensityColor = (intensity: number): string => {
    switch (intensity) {
      case 0: return 'var(--color-bg)'
      case 1: return 'rgba(255, 107, 53, 0.25)'
      case 2: return 'rgba(255, 107, 53, 0.5)'
      case 3: return 'rgba(255, 107, 53, 0.75)'
      case 4: return 'var(--color-accent)'
      default: return 'var(--color-bg)'
    }
  }

  return (
    <div 
      className="p-4 rounded-xl"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      <h3 
        className="text-lg font-semibold mb-4 text-center"
        style={{ color: 'var(--color-text)' }}
      >
        {monthNames[month]} {year}
      </h3>
      
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div 
            key={i}
            className="text-center text-xs font-medium py-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const words = day ? (activity.get(day) || 0) : 0
          const intensity = getIntensity(words)
          const isToday = day === new Date().getDate() && 
            month === new Date().getMonth() && 
            year === new Date().getFullYear()
          
          return (
            <div
              key={i}
              className={`
                aspect-square rounded-sm flex items-center justify-center text-xs
                ${isToday ? 'ring-2 ring-offset-1 ring-[var(--color-accent)]' : ''}
              `}
              style={{ 
                backgroundColor: day ? getIntensityColor(intensity) : 'transparent',
                color: intensity >= 3 ? 'white' : 'var(--color-text-muted)',
              }}
              title={day ? `${words} words` : ''}
            >
              {day}
            </div>
          )
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Less</span>
        {[0, 1, 2, 3, 4].map(intensity => (
          <div
            key={intensity}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: getIntensityColor(intensity) }}
          />
        ))}
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>More</span>
      </div>
    </div>
  )
}
