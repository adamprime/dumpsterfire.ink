import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { SparksAnimation } from './SparksAnimation'

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}))

import confetti from 'canvas-confetti'

describe('SparksAnimation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('does not trigger confetti when trigger is false', () => {
    render(<SparksAnimation trigger={false} />)
    expect(confetti).not.toHaveBeenCalled()
  })

  it('triggers confetti when trigger becomes true', () => {
    render(<SparksAnimation trigger={true} />)
    
    // Should call confetti at least once
    expect(confetti).toHaveBeenCalled()
  })

  it('calls confetti with ember-like colors', () => {
    render(<SparksAnimation trigger={true} />)
    
    const call = vi.mocked(confetti).mock.calls[0]?.[0]
    expect(call).toBeDefined()
    expect(call?.colors).toContain('#ff6b35') // orange
    expect(call?.colors).toContain('#f7931e') // amber
  })

  it('confetti originates from bottom of screen', () => {
    render(<SparksAnimation trigger={true} />)
    
    const call = vi.mocked(confetti).mock.calls[0]?.[0]
    expect(call?.origin?.y).toBeGreaterThan(1) // Bottom edge
  })

  it('renders nothing visible (animation only)', () => {
    const { container } = render(<SparksAnimation trigger={true} />)
    expect(container.innerHTML).toBe('')
  })
})
