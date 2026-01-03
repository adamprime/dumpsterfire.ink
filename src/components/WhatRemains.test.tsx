import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WhatRemains } from './WhatRemains'
import type { EntryMetadata } from '../types/filesystem'

const mockMetadata: EntryMetadata = {
  id: 'test-id',
  date: '2026-01-03',
  session: 1,
  createdAt: '2026-01-03T10:00:00.000Z',
  updatedAt: '2026-01-03T10:30:00.000Z',
  wordCount: 750,
  goalReached: true,
  writingTimeSeconds: 1800, // 30 minutes
}

const mockMetadataWithAnalysis: EntryMetadata = {
  ...mockMetadata,
  analysis: {
    analyzedAt: '2026-01-03T10:35:00.000Z',
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    sentiment: {
      overall: 'positive',
      score: 0.8,
    },
    themes: ['gratitude', 'reflection', 'growth'],
    mindset: 'The writer shows an optimistic and reflective mindset.',
    summary: 'A thoughtful entry exploring personal growth and gratitude.',
  },
}

describe('WhatRemains', () => {
  it('renders the header with title', () => {
    render(
      <WhatRemains
        metadata={mockMetadata}
        isAnalyzing={false}
        onClose={vi.fn()}
        wordGoal={750}
      />
    )
    expect(screen.getByText('What Remains')).toBeInTheDocument()
  })

  it('displays word count stat', () => {
    render(
      <WhatRemains
        metadata={mockMetadata}
        isAnalyzing={false}
        onClose={vi.fn()}
        wordGoal={750}
      />
    )
    expect(screen.getByText('750')).toBeInTheDocument()
    expect(screen.getByText(/words.*750 goal/)).toBeInTheDocument()
  })

  it('displays writing time stat', () => {
    render(
      <WhatRemains
        metadata={mockMetadata}
        isAnalyzing={false}
        onClose={vi.fn()}
        wordGoal={750}
      />
    )
    expect(screen.getByText('30m 0s')).toBeInTheDocument()
    expect(screen.getByText('active writing')).toBeInTheDocument()
  })

  it('calculates and displays WPM', () => {
    render(
      <WhatRemains
        metadata={mockMetadata}
        isAnalyzing={false}
        onClose={vi.fn()}
        wordGoal={750}
      />
    )
    // 750 words / 30 minutes = 25 WPM
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('words per minute')).toBeInTheDocument()
  })

  it('displays session number', () => {
    render(
      <WhatRemains
        metadata={mockMetadata}
        isAnalyzing={false}
        onClose={vi.fn()}
        wordGoal={750}
      />
    )
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('session today')).toBeInTheDocument()
  })

  it('shows loading state when analyzing', () => {
    render(
      <WhatRemains
        metadata={mockMetadata}
        isAnalyzing={true}
        onClose={vi.fn()}
        wordGoal={750}
      />
    )
    expect(screen.getByText('Sifting through the ashes...')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <WhatRemains
        metadata={mockMetadata}
        isAnalyzing={false}
        onClose={onClose}
        wordGoal={750}
      />
    )
    
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('displays analysis sentiment when available', () => {
    render(
      <WhatRemains
        metadata={mockMetadataWithAnalysis}
        isAnalyzing={false}
        onClose={vi.fn()}
        wordGoal={750}
      />
    )
    expect(screen.getByText('positive')).toBeInTheDocument()
  })

  it('displays analysis themes when available', () => {
    render(
      <WhatRemains
        metadata={mockMetadataWithAnalysis}
        isAnalyzing={false}
        onClose={vi.fn()}
        wordGoal={750}
      />
    )
    expect(screen.getByText('gratitude')).toBeInTheDocument()
    expect(screen.getByText('reflection')).toBeInTheDocument()
    expect(screen.getByText('growth')).toBeInTheDocument()
  })

  it('displays analysis mindset when available', () => {
    render(
      <WhatRemains
        metadata={mockMetadataWithAnalysis}
        isAnalyzing={false}
        onClose={vi.fn()}
        wordGoal={750}
      />
    )
    expect(screen.getByText('The writer shows an optimistic and reflective mindset.')).toBeInTheDocument()
  })

  it('displays analysis summary when available', () => {
    render(
      <WhatRemains
        metadata={mockMetadataWithAnalysis}
        isAnalyzing={false}
        onClose={vi.fn()}
        wordGoal={750}
      />
    )
    expect(screen.getByText('A thoughtful entry exploring personal growth and gratitude.')).toBeInTheDocument()
  })

  it('shows "No analysis yet" message when no analysis', () => {
    render(
      <WhatRemains
        metadata={mockMetadata}
        isAnalyzing={false}
        onClose={vi.fn()}
        wordGoal={750}
      />
    )
    expect(screen.getByText('No analysis yet')).toBeInTheDocument()
  })

  it('displays the date in human-readable format', () => {
    render(
      <WhatRemains
        metadata={mockMetadata}
        isAnalyzing={false}
        onClose={vi.fn()}
        wordGoal={750}
      />
    )
    // Should show "Friday, January 3" or similar
    expect(screen.getByText(/january 3/i)).toBeInTheDocument()
  })

  it('shows provider info when analysis is available', () => {
    render(
      <WhatRemains
        metadata={mockMetadataWithAnalysis}
        isAnalyzing={false}
        onClose={vi.fn()}
        wordGoal={750}
      />
    )
    expect(screen.getByText(/via anthropic/i)).toBeInTheDocument()
  })

  it('handles zero writing time gracefully', () => {
    const metadataNoTime: EntryMetadata = {
      ...mockMetadata,
      writingTimeSeconds: 0,
    }
    render(
      <WhatRemains
        metadata={metadataNoTime}
        isAnalyzing={false}
        onClose={vi.fn()}
        wordGoal={750}
      />
    )
    // WPM should be 0 when no time recorded
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
