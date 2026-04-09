import { useCallback, useRef, useEffect } from 'react'
import { useSyncStore } from '../stores/syncStore'

/**
 * Hook that batches git commits. Commits fire on:
 * - editor blur (window blur)
 * - idle >30s since last keystroke
 * - explicit trigger (view navigation, goal reached, manual save)
 * 
 * OPFS autosave continues every 2s -- this only controls the git commit layer.
 */
export function useSyncCommit() {
  const { gitSync } = useSyncStore()
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef(Date.now())

  const triggerCommit = useCallback((message: string) => {
    if (!gitSync) return
    gitSync.commit(message)
  }, [gitSync])

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now()

    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      triggerCommit(`auto: idle commit ${new Date().toISOString()}`)
    }, 30000)
  }, [triggerCommit])

  // Commit on window blur
  useEffect(() => {
    if (!gitSync) return

    const handleBlur = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      triggerCommit(`auto: blur commit ${new Date().toISOString()}`)
    }

    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('blur', handleBlur)
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [gitSync, triggerCommit])

  return { triggerCommit, recordSyncActivity: recordActivity }
}
