import { useEffect, useState } from 'react'

interface FireAnimationProps {
  trigger: boolean
  onComplete: () => void
}

export function FireAnimation({ trigger, onComplete }: FireAnimationProps) {
  const [phase, setPhase] = useState<'idle' | 'rising' | 'fading'>('idle')

  useEffect(() => {
    if (!trigger) return

    setPhase('rising')
    
    const riseTimer = setTimeout(() => {
      setPhase('fading')
    }, 800)

    const completeTimer = setTimeout(() => {
      setPhase('idle')
      onComplete()
    }, 1400)

    return () => {
      clearTimeout(riseTimer)
      clearTimeout(completeTimer)
    }
  }, [trigger, onComplete])

  if (phase === 'idle') return null

  return (
    <div 
      className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
      style={{ perspective: '1000px' }}
    >
      {/* Fire gradient overlay */}
      <div
        className="absolute inset-x-0 bottom-0 transition-all duration-700 ease-out"
        style={{
          height: phase === 'rising' ? '120%' : '0%',
          opacity: phase === 'fading' ? 0 : 1,
          background: `linear-gradient(
            to top,
            rgba(255, 68, 0, 0.95) 0%,
            rgba(255, 107, 53, 0.85) 20%,
            rgba(255, 166, 0, 0.7) 40%,
            rgba(255, 200, 0, 0.5) 60%,
            rgba(255, 220, 100, 0.3) 80%,
            transparent 100%
          )`,
          transition: phase === 'rising' 
            ? 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)' 
            : 'opacity 0.6s ease-out',
        }}
      />
      
      {/* Flame particles */}
      {phase === 'rising' && (
        <>
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-flame-particle"
              style={{
                left: `${10 + Math.random() * 80}%`,
                bottom: '-20px',
                width: `${8 + Math.random() * 16}px`,
                height: `${12 + Math.random() * 24}px`,
                background: `radial-gradient(ellipse, 
                  ${['#ffcc00', '#ff9500', '#ff6b35', '#ff4400'][Math.floor(Math.random() * 4)]} 0%, 
                  transparent 70%)`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.8 + Math.random() * 0.4}s`,
              }}
            />
          ))}
        </>
      )}

      <style>{`
        @keyframes flame-particle {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) scale(0.3);
            opacity: 0;
          }
        }
        .animate-flame-particle {
          animation: flame-particle linear forwards;
        }
      `}</style>
    </div>
  )
}
