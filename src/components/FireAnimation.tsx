import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'

interface FireAnimationProps {
  trigger: boolean
  onComplete: () => void
}

interface WaveConfig {
  duration: number
  particleCount: number
  spread: number
  startVelocity: number
  scalar: number
  colors: string[]
}

const WAVE_CONFIGS: WaveConfig[] = [
  // Wave 1: Normal intensity (like sparks)
  {
    duration: 800,
    particleCount: 4,
    spread: 70,
    startVelocity: 45,
    scalar: 0.7,
    colors: ['#ff6b35', '#f7931e', '#ffcc02', '#ff4444'],
  },
  // Wave 2: More intense, warmer colors
  {
    duration: 700,
    particleCount: 8,
    spread: 90,
    startVelocity: 55,
    scalar: 0.9,
    colors: ['#ff4444', '#ff6b35', '#ff8c00', '#ffcc02'],
  },
  // Wave 3: Maximum intensity, brightest
  {
    duration: 1000,
    particleCount: 12,
    spread: 120,
    startVelocity: 65,
    scalar: 1.1,
    colors: ['#ff2200', '#ff4444', '#ff6b35', '#ffaa00', '#ffcc02'],
  },
]

export function FireAnimation({ trigger, onComplete }: FireAnimationProps) {
  const animationRef = useRef<number | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!trigger) return

    let waveIndex = 0
    let waveStart = Date.now()

    const fireWave = (config: WaveConfig) => {
      // Fire from multiple origins for more dramatic effect
      const origins = [
        { x: 0.2, y: 1.1 },
        { x: 0.5, y: 1.1 },
        { x: 0.8, y: 1.1 },
      ]

      origins.forEach((origin) => {
        confetti({
          particleCount: config.particleCount,
          angle: 90,
          spread: config.spread,
          startVelocity: config.startVelocity,
          origin,
          colors: config.colors,
          shapes: ['circle'],
          scalar: config.scalar,
          gravity: 0.6,
          drift: (Math.random() - 0.5) * 0.8,
          ticks: 200,
        })
      })
    }

    const frame = () => {
      const config = WAVE_CONFIGS[waveIndex]!
      const elapsed = Date.now() - waveStart

      fireWave(config)

      // Check if current wave is done
      if (elapsed >= config.duration) {
        waveIndex++
        waveStart = Date.now()

        // Check if all waves are done
        if (waveIndex >= WAVE_CONFIGS.length) {
          // Small delay before completing to let particles settle
          timeoutRef.current = setTimeout(() => {
            onComplete()
          }, 300)
          return
        }
      }

      animationRef.current = requestAnimationFrame(frame)
    }

    // Start the animation
    animationRef.current = requestAnimationFrame(frame)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [trigger, onComplete])

  return null
}
