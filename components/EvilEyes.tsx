'use client'
import { useEffect, useState } from 'react'

export default function EvilEyes() {
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    function handle(e: MouseEvent) {
      const x = e.clientX / window.innerWidth - 0.5
      const y = e.clientY / window.innerHeight - 0.5
      setPos({ x, y })
    }
    window.addEventListener('mousemove', handle)
    return () => window.removeEventListener('mousemove', handle)
  }, [])

  const offsetX = pos.x * 20
  const offsetY = pos.y * 10
  // Increase base distance slightly for a wider stare
  const base = 90

  return (
    <div className="evil-eyes fixed inset-0 flex items-center justify-center pointer-events-none -z-10">
      <div className="eye left" style={{ transform: `translate(${offsetX - base}px, ${offsetY}px)` }}>
        <div className="inner-eye left" />
      </div>
      <div className="eye right" style={{ transform: `translate(${offsetX + base}px, ${offsetY}px)` }}>
        <div className="inner-eye right" style={{ animationDelay: '0.2s' }} />
      </div>
      <div className="mist" />
    </div>
  )
}
