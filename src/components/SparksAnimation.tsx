import { useEffect } from 'react'
import confetti from 'canvas-confetti'

interface SparksAnimationProps {
  trigger: boolean
}

export function SparksAnimation({ trigger }: SparksAnimationProps) {
  useEffect(() => {
    if (!trigger) return

    const duration = 3000
    const end = Date.now() + duration

    const colors = ['#ff6b35', '#f7931e', '#ffcc02', '#ff4444']

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 90,
        spread: 60,
        startVelocity: 40,
        origin: { x: Math.random(), y: 1.1 },
        colors,
        shapes: ['circle'],
        scalar: 0.6,
        gravity: 0.8,
        drift: (Math.random() - 0.5) * 0.5,
        ticks: 200,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    frame()
  }, [trigger])

  return null
}
