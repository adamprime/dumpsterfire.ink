import { useState, useCallback, useRef, useEffect } from 'react'

const INACTIVITY_TIMEOUT = 5000 // 5 seconds of inactivity = stop counting

interface WritingStats {
  activeTimeSeconds: number
  wpm: number
  formattedTime: string
  recordActivity: () => void
  reset: () => void
}

export function useWritingStats(wordCount: number): WritingStats {
  const [activeTimeSeconds, setActiveTimeSeconds] = useState(0)
  const isActiveRef = useRef(false)
  const lastActivityRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTracking = useCallback(() => {
    if (intervalRef.current) return
    
    intervalRef.current = setInterval(() => {
      const now = Date.now()
      const timeSinceActivity = now - lastActivityRef.current
      
      if (timeSinceActivity < INACTIVITY_TIMEOUT) {
        setActiveTimeSeconds((prev) => prev + 1)
      } else {
        isActiveRef.current = false
      }
    }, 1000)
  }, [])

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    if (!isActiveRef.current) {
      isActiveRef.current = true
      startTracking()
    }
  }, [startTracking])

  const reset = useCallback(() => {
    setActiveTimeSeconds(0)
    isActiveRef.current = false
    lastActivityRef.current = 0
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const wpm = activeTimeSeconds > 0
    ? Math.round((wordCount / activeTimeSeconds) * 60)
    : 0

  const minutes = Math.floor(activeTimeSeconds / 60)
  const seconds = activeTimeSeconds % 60
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`

  return {
    activeTimeSeconds,
    wpm,
    formattedTime,
    recordActivity,
    reset,
  }
}
