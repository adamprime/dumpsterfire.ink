interface QuillLoaderProps {
  className?: string
}

export function QuillLoader({ className = '' }: QuillLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-quill"
      >
        {/* Quill pen */}
        <g className="origin-bottom-left">
          <path
            d="M12 52 L52 12 Q56 8 54 6 Q52 4 48 8 L8 48 Q6 50 8 52 Q10 54 12 52Z"
            fill="var(--color-text-muted)"
            opacity="0.8"
          />
          {/* Feather details */}
          <path
            d="M48 12 Q44 16 40 14 Q36 12 38 8"
            stroke="var(--color-text-muted)"
            strokeWidth="1"
            fill="none"
            opacity="0.5"
          />
          <path
            d="M44 16 Q40 20 36 18 Q32 16 34 12"
            stroke="var(--color-text-muted)"
            strokeWidth="1"
            fill="none"
            opacity="0.5"
          />
          {/* Nib */}
          <path
            d="M8 48 L12 52 L6 58 L4 56 Z"
            fill="var(--color-accent)"
          />
        </g>
      </svg>
      
      {/* Wavy line being drawn */}
      <svg
        width="120"
        height="24"
        viewBox="0 0 120 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 12 Q15 4 30 12 T60 12 T90 12 T120 12"
          stroke="var(--color-accent)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          className="animate-draw-line"
        />
      </svg>
      
      <p 
        className="text-sm animate-pulse"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Sifting through the ashes...
      </p>

      <style>{`
        @keyframes quill-write {
          0%, 100% {
            transform: rotate(-5deg) translateX(0);
          }
          50% {
            transform: rotate(5deg) translateX(4px);
          }
        }
        
        @keyframes draw-line {
          0% {
            stroke-dasharray: 200;
            stroke-dashoffset: 200;
          }
          50% {
            stroke-dashoffset: 0;
          }
          50.1% {
            stroke-dasharray: 200;
            stroke-dashoffset: 200;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        
        .animate-quill {
          animation: quill-write 1s ease-in-out infinite;
        }
        
        .animate-draw-line {
          animation: draw-line 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
