import { useSyncStore } from '../stores/syncStore'
import { daysUntilExpiration } from '../lib/sync/pat-store'

export function SyncStatusIndicator() {
  const { status, patExpiresAt } = useSyncStore()

  const daysLeft = daysUntilExpiration(patExpiresAt)
  const showExpirationWarning = daysLeft !== null && daysLeft <= 14

  const statusConfig = {
    disconnected: { label: 'Local only', color: 'var(--color-text-muted)', icon: '○' },
    synced: { label: 'Synced', color: '#22c55e', icon: '●' },
    syncing: { label: 'Syncing...', color: 'var(--color-accent)', icon: '◌' },
    offline: { label: 'Offline', color: '#f59e0b', icon: '◐' },
    error: { label: 'Sync error', color: '#ef4444', icon: '✕' },
  }

  const cfg = statusConfig[status.state]

  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: cfg.color }}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
      {status.state === 'syncing' && (
        <span style={{ color: 'var(--color-text-muted)' }}>({status.operation})</span>
      )}
      {status.state === 'offline' && (
        <span style={{ color: 'var(--color-text-muted)' }}>({status.pendingCommits} pending)</span>
      )}
      {status.state === 'error' && (
        <span title={status.message}>!</span>
      )}
      {showExpirationWarning && (
        <span
          className="ml-1"
          style={{ color: daysLeft <= 3 ? '#ef4444' : '#f59e0b' }}
          title={`GitHub token expires in ${daysLeft} days`}
        >
          {daysLeft <= 0 ? '⚠ Token expired' : `⚠ Token: ${daysLeft}d`}
        </span>
      )}
    </div>
  )
}
