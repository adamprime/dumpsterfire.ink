import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWritingStats } from './useWritingStats'

describe('useWritingStats', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with zero values', () => {
    const { result } = renderHook(() => useWritingStats(0))
    
    expect(result.current.activeTimeSeconds).toBe(0)
    expect(result.current.wpm).toBe(0)
    expect(result.current.formattedTime).toBe('0:00')
  })

  it('tracks active time when typing', () => {
    const { result } = renderHook(() => useWritingStats(10))
    
    act(() => {
      result.current.recordActivity()
    })
    
    // Advance by 1 second intervals to trigger setInterval callbacks
    for (let i = 0; i < 5; i++) {
      act(() => {
        vi.advanceTimersByTime(1000)
      })
    }
    
    // Timer counts after each interval, so 5 intervals = 4-5 seconds
    expect(result.current.activeTimeSeconds).toBeGreaterThanOrEqual(4)
    expect(result.current.activeTimeSeconds).toBeLessThanOrEqual(5)
  })

  it('stops counting after inactivity timeout', () => {
    const { result } = renderHook(() => useWritingStats(10))
    
    act(() => {
      result.current.recordActivity()
    })
    
    // Advance 3 seconds
    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(1000)
      })
    }
    
    expect(result.current.activeTimeSeconds).toBe(3)
    
    // Advance another 6 seconds without activity (should stop after 5s timeout)
    for (let i = 0; i < 6; i++) {
      act(() => {
        vi.advanceTimersByTime(1000)
      })
    }
    
    // Should have stopped counting - will be 4 or 5 due to timeout check
    expect(result.current.activeTimeSeconds).toBeLessThanOrEqual(5)
  })

  it('calculates WPM correctly', () => {
    const { result, rerender } = renderHook(
      ({ wordCount }) => useWritingStats(wordCount),
      { initialProps: { wordCount: 0 } }
    )
    
    act(() => {
      result.current.recordActivity()
    })
    
    // Simulate typing by keeping activity fresh
    for (let i = 0; i < 60; i++) {
      act(() => {
        result.current.recordActivity()
        vi.advanceTimersByTime(1000)
      })
    }
    
    rerender({ wordCount: 50 })
    
    // WPM should be 50 (50 words / 60 seconds * 60)
    expect(result.current.wpm).toBe(50)
  })

  it('formats time correctly', () => {
    const { result } = renderHook(() => useWritingStats(0))
    
    act(() => {
      result.current.recordActivity()
    })
    
    // Keep active and advance 65 seconds
    for (let i = 0; i < 65; i++) {
      act(() => {
        result.current.recordActivity()
        vi.advanceTimersByTime(1000)
      })
    }
    
    expect(result.current.formattedTime).toBe('1:05')
  })

  it('resets stats', () => {
    const { result } = renderHook(() => useWritingStats(50))
    
    act(() => {
      result.current.recordActivity()
    })
    
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.recordActivity()
        vi.advanceTimersByTime(1000)
      })
    }
    
    expect(result.current.activeTimeSeconds).toBeGreaterThan(0)
    
    act(() => {
      result.current.reset()
    })
    
    expect(result.current.activeTimeSeconds).toBe(0)
  })
})
