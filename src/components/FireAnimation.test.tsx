import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { act } from 'react'
import { FireAnimation } from './FireAnimation'

describe('FireAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when trigger is false', () => {
    const onComplete = vi.fn()
    const { container } = render(<FireAnimation trigger={false} onComplete={onComplete} />)
    
    // Should be empty or have no visible content
    expect(container.querySelector('.fixed')).toBeNull()
  })

  it('renders fire overlay when trigger is true', () => {
    const onComplete = vi.fn()
    const { container } = render(<FireAnimation trigger={true} onComplete={onComplete} />)
    
    // Should have the fixed overlay
    expect(container.querySelector('.fixed')).not.toBeNull()
  })

  it('calls onComplete after animation finishes', async () => {
    const onComplete = vi.fn()
    render(<FireAnimation trigger={true} onComplete={onComplete} />)
    
    // Fast forward through animation (1200ms rise + 1000ms fade = 2200ms)
    await act(async () => {
      vi.advanceTimersByTime(2300)
    })
    
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('does not call onComplete prematurely', async () => {
    const onComplete = vi.fn()
    render(<FireAnimation trigger={true} onComplete={onComplete} />)
    
    // Only advance 1000ms - should not complete yet
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('shows flame particles during rising phase', () => {
    const onComplete = vi.fn()
    const { container } = render(<FireAnimation trigger={true} onComplete={onComplete} />)
    
    // Should have particle elements
    const particles = container.querySelectorAll('.animate-flame-particle')
    expect(particles.length).toBeGreaterThan(0)
  })

  it('transitions through phases correctly', async () => {
    const onComplete = vi.fn()
    const { container } = render(<FireAnimation trigger={true} onComplete={onComplete} />)
    
    // Initially should be in rising phase (visible)
    expect(container.querySelector('.fixed')).not.toBeNull()
    
    // After 1200ms, should start fading
    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    
    // After 2200ms total, should complete and disappear
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(onComplete).toHaveBeenCalled()
  })
})
