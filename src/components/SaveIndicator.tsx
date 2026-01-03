interface SaveIndicatorProps {
  isDirty: boolean
  isSaving: boolean
  lastSaveTime: Date | null
  onSave: () => void
}

export function SaveIndicator({ isDirty, isSaving, lastSaveTime, onSave }: SaveIndicatorProps) {
  // Nothing to show if never saved and not dirty
  if (!isDirty && !isSaving && !lastSaveTime) {
    return null
  }

  // Saving in progress
  if (isSaving) {
    return (
      <button
        disabled
        className="text-sm px-2 py-1 rounded flex items-center gap-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span className="animate-pulse">●</span>
        Saving...
      </button>
    )
  }

  // Has unsaved changes
  if (isDirty) {
    return (
      <button
        onClick={onSave}
        className="text-sm px-2 py-1 rounded transition-colors"
        style={{ 
          backgroundColor: 'var(--color-accent)',
          color: 'white',
        }}
      >
        Save
      </button>
    )
  }

  // Saved state
  return (
    <span 
      className="text-sm flex items-center gap-1"
      style={{ color: 'var(--color-text-muted)' }}
    >
      <span style={{ color: '#22c55e' }}>✓</span>
      Saved
    </span>
  )
}
