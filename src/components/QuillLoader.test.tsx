import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QuillLoader } from './QuillLoader'

describe('QuillLoader', () => {
  it('renders the loading message', () => {
    render(<QuillLoader />)
    expect(screen.getByText('Sifting through the ashes...')).toBeInTheDocument()
  })

  it('renders the quill SVG', () => {
    const { container } = render(<QuillLoader />)
    const svg = container.querySelector('svg.animate-quill')
    expect(svg).toBeInTheDocument()
  })

  it('renders the wavy line SVG', () => {
    const { container } = render(<QuillLoader />)
    const wavyLine = container.querySelector('.animate-draw-line')
    expect(wavyLine).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const { container } = render(<QuillLoader className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has animation classes for visual effect', () => {
    const { container } = render(<QuillLoader />)
    
    // Check for quill animation
    expect(container.querySelector('.animate-quill')).toBeInTheDocument()
    
    // Check for line drawing animation
    expect(container.querySelector('.animate-draw-line')).toBeInTheDocument()
    
    // Check for pulse animation on text
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })
})
