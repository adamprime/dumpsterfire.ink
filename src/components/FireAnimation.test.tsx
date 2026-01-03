import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { act } from 'react'
import confetti from 'canvas-confetti'
import { FireAnimation } from './FireAnimation'

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}))

describe('FireAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(confetti).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not trigger confetti when trigger is false', () => {
    const onComplete = vi.fn()
    render(<FireAnimation trigger={false} onComplete={onComplete} />)
    
    expect(confetti).not.toHaveBeenCalled()
  })

  it('triggers confetti waves when trigger is true', async () => {
    const onComplete = vi.fn()
    render(<FireAnimation trigger={true} onComplete={onComplete} />)
    
    // Allow first wave to start
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    
    expect(confetti).toHaveBeenCalled()
  })

  it('calls onComplete after all waves finish', async () => {
    const onComplete = vi.fn()
    render(<FireAnimation trigger={true} onComplete={onComplete} />)
    
    // Total duration: ~2500ms (3 waves)
    await act(async () => {
      vi.advanceTimersByTime(3000)
    })
    
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('does not call onComplete prematurely', async () => {
    const onComplete = vi.fn()
    render(<FireAnimation trigger={true} onComplete={onComplete} />)
    
    // Only advance 500ms - should not complete yet
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('fires multiple waves with increasing intensity', async () => {
    const onComplete = vi.fn()
    render(<FireAnimation trigger={true} onComplete={onComplete} />)
    
    // Let it run through all waves
    await act(async () => {
      vi.advanceTimersByTime(3000)
    })
    
    // Should have been called many times across all waves
    expect(vi.mocked(confetti).mock.calls.length).toBeGreaterThan(10)
  })
})
