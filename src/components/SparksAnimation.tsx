import { useEffect } from 'react'
import confetti from 'canvas-confetti'

interface SparksAnimationProps {
  trigger: boolean
}

export function SparksAnimation({ trigger }: SparksAnimationProps) {
  useEffect(() => {
    if (!trigger) return

    const duration = 5000 // Extended from 3000
    const end = Date.now() + duration

    const colors = ['#ff6b35', '#f7931e', '#ffcc02', '#ff4444']

    const frame = () => {
      confetti({
        particleCount: 3, // Slightly more particles
        angle: 90,
        spread: 70, // Wider spread
        startVelocity: 45,
        origin: { x: Math.random(), y: 1.1 },
        colors,
        shapes: ['circle'],
        scalar: 0.7,
        gravity: 0.7, // Slower fall
        drift: (Math.random() - 0.5) * 0.5,
        ticks: 250, // Longer lifetime
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    frame()
  }, [trigger])

  return null
}
