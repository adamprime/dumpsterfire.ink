import { describe, it, expect } from 'vitest'
import type { Theme } from '../stores/appStore'

describe('themes', () => {
  const themes: Theme[] = ['dark', 'light', 'sepia', 'matrix', 'parchment']

  it('has 5 themes defined', () => {
    expect(themes).toHaveLength(5)
  })

  it('includes all required themes', () => {
    expect(themes).toContain('dark')
    expect(themes).toContain('light')
    expect(themes).toContain('sepia')
    expect(themes).toContain('matrix')
    expect(themes).toContain('parchment')
  })
})
