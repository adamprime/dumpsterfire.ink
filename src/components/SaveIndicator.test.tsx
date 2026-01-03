import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SaveIndicator } from './SaveIndicator'

describe('SaveIndicator', () => {
  it('shows "Save" button when dirty and not saving', () => {
    render(
      <SaveIndicator 
        isDirty={true} 
        isSaving={false} 
        lastSaveTime={null}
        onSave={vi.fn()} 
      />
    )
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('shows "Saving..." when save is in progress', () => {
    render(
      <SaveIndicator 
        isDirty={true} 
        isSaving={true} 
        lastSaveTime={null}
        onSave={vi.fn()} 
      />
    )
    expect(screen.getByText(/saving/i)).toBeInTheDocument()
  })

  it('shows "Saved" when not dirty and has been saved', () => {
    render(
      <SaveIndicator 
        isDirty={false} 
        isSaving={false} 
        lastSaveTime={new Date()}
        onSave={vi.fn()} 
      />
    )
    expect(screen.getByText(/saved/i)).toBeInTheDocument()
  })

  it('calls onSave when Save button is clicked', () => {
    const onSave = vi.fn()
    render(
      <SaveIndicator 
        isDirty={true} 
        isSaving={false} 
        lastSaveTime={null}
        onSave={onSave} 
      />
    )
    
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('disables Save button while saving', () => {
    render(
      <SaveIndicator 
        isDirty={true} 
        isSaving={true} 
        lastSaveTime={null}
        onSave={vi.fn()} 
      />
    )
    
    const savingElement = screen.getByText(/saving/i)
    expect(savingElement.closest('button')).toBeDisabled()
  })

  it('shows nothing when not dirty and never saved', () => {
    const { container } = render(
      <SaveIndicator 
        isDirty={false} 
        isSaving={false} 
        lastSaveTime={null}
        onSave={vi.fn()} 
      />
    )
    // Should render empty or minimal
    expect(container.textContent).toBe('')
  })
})
