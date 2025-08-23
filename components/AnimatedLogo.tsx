'use client'
import { useEffect, useRef } from 'react'

export default function AnimatedLogo({ className = '' }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    fetch('/OINTment_logo_vert.svg')
      .then(res => res.text())
      .then(txt => {
        const parser = new DOMParser()
        const doc = parser.parseFromString(txt, 'image/svg+xml')
        const outline = doc.getElementById('outline')
        if (outline && ref.current) {
          outline.setAttribute('class', 'animate-logo-draw')
          ref.current.appendChild(outline)
        }
      })
      .catch(() => {})
  }, [])

  return <svg ref={ref} viewBox="0 0 2048 2048" className={className} />
}
