"use client"
import { useRef, useEffect, useState, CSSProperties } from 'react'

type Cell = { id: number; x: number; y: number; start: number }

export default function HexBackground({ className = "", reveal = true }: { className?: string; reveal?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [cells, setCells] = useState<Cell[]>([])

  // track pointer for reveal mask
  useEffect(() => {
    if (!reveal || !ref.current) return
    const el = ref.current as HTMLDivElement
    function move(e: PointerEvent) {
      const t = e.target as HTMLElement
      if (t.closest('.no-hex')) {
        el.style.setProperty('--mx', '-999px')
        el.style.setProperty('--my', '-999px')
        return
      }
      el.style.setProperty('--mx', `${e.clientX}px`)
      el.style.setProperty('--my', `${e.clientY}px`)
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [reveal])

  // spawn red hexes independently of cursor
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current as HTMLDivElement

    function spawn() {
      const now = Date.now()
      const { width, height } = el.getBoundingClientRect()
      const count = Math.random() < 0.5 ? 1 : 2
      const next = Array.from({ length: count }).map(() => ({
        id: now + Math.random(),
        x: Math.floor((Math.random() * width) / 20) * 20,
        y: Math.floor((Math.random() * height) / 17.32) * 17.32,
        start: now
      }))
      setCells(prev => [...prev.filter(c => now - c.start < 6000), ...next])
    }

    spawn()
    const t = setInterval(spawn, 3000)
    return () => clearInterval(t)
  }, [])

  const mask = reveal
    ? 'radial-gradient(circle 120px at var(--mx) var(--my), rgba(0,0,0,1) 0 80px, rgba(0,0,0,0) 120px)'
    : undefined

  return (
    <div
      ref={ref}
      className={`pointer-events-none fixed inset-0 -z-20 ${className}`}
      style={{ '--mx': '-999px', '--my': '-999px', ...(mask ? { mask, WebkitMask: mask } : {}) } as CSSProperties}
    >
      <div className="absolute inset-0 pattern" />
      {cells.map(c => (
        <span key={c.id} className="hex-anim" style={{ left: c.x, top: c.y }} />
      ))}
      <style jsx>{`
        .pattern {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='20' height='17.32' viewBox='0 0 20 17.32'><path fill='none' stroke='white' stroke-opacity='0.1' stroke-width='1' d='M5 0h10l5 8.66-5 8.66H5L0 8.66z'/></svg>`)}");
          background-size: 20px 17.32px;
          opacity: 0.25;
        }
        .hex-anim {
          position: absolute;
          width: 20px;
          height: 17.32px;
          clip-path: polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);
          background: rgba(220,38,38,0.25);
          filter: drop-shadow(0 0 3px rgba(220,38,38,0.25));
          animation: fadeHex 6s forwards;
        }
        .hex-anim::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(16,185,129,0.4);
          transform: scaleY(0);
          transform-origin: bottom;
          filter: drop-shadow(0 0 4px rgba(16,185,129,0.6));
          animation: fillHex 6s forwards;
        }
        @keyframes fillHex {
          0% { transform: scaleY(0); }
          20% { transform: scaleY(0); }
          100% { transform: scaleY(1); }
        }
        @keyframes fadeHex {
          0%,80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

