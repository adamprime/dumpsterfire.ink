interface StreakDisplayProps {
  streak: number
}

export function StreakDisplay({ streak }: StreakDisplayProps) {
  const getStreakMessage = () => {
    if (streak === 0) return "Start your streak today!"
    if (streak === 1) return "day streak - keep it going!"
    if (streak < 7) return "day streak - building momentum!"
    if (streak < 30) return "day streak - on fire!"
    return "day streak - unstoppable!"
  }

  return (
    <div 
      className="p-6 rounded-xl text-center"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      <div className="flex items-center justify-center gap-3 mb-2">
        <span className="text-5xl">🔥</span>
        <span 
          className="text-6xl font-bold"
          style={{ color: 'var(--color-accent)' }}
        >
          {streak}
        </span>
      </div>
      <p 
        className="text-lg"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {getStreakMessage()}
      </p>
    </div>
  )
}
