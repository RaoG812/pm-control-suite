'use client'
import { useEffect, useRef, useState, Fragment } from 'react'

const POSITIONS = [
  { x: 60, y: 225 }, // apex (selected)
  { x: 390, y: 120 }, // top right
  { x: 390, y: 330 } // bottom right
]
const PATH_D = `M${POSITIONS[0].x},${POSITIONS[0].y} L${POSITIONS[1].x},${POSITIONS[1].y} L${POSITIONS[2].x},${POSITIONS[2].y} Z`
// position pointer slightly left of the selected ring
const POINTER_POS = { x: POSITIONS[0].x - 110, y: POSITIONS[0].y }
const ORDER = [
  [0, 1, 2],
  [2, 0, 1],
  [1, 2, 0]
]

interface DocMeta {
  name: string
  type: string
}

export function OintCreationFlow({
  docs,
  repo,
  roast
}: {
  docs: DocMeta[]
  repo: boolean
  roast: boolean
}) {
  const aspects = [
    {
      key: 'docs',
      label: 'DOX',
      pct: Math.round((docs.length / 5) * 100),
      color: '#22c55e',
      comment:
        docs.length > 0
          ? docs.map(d => `${d.type.toUpperCase()}: ${d.name}`).join(', ')
          : 'No docs uploaded'
    },
    {
      key: 'repo',
      label: 'Repo',
      pct: repo ? 100 : 0,
      color: '#0ea5e9',
      comment: repo ? 'Repository analyzed' : 'Repo not analyzed'
    },
    {
      key: 'roast',
      label: 'Roast',
      pct: roast ? 100 : 0,
      color: '#ef4444',
      comment: roast ? 'Roaster run complete' : 'Roast not run'
    }
  ]

  const [idx, setIdx] = useState(0)
  const [pointerScale, setPointerScale] = useState(1)
  const [settled, setSettled] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const resumeRef = useRef<NodeJS.Timeout | null>(null)

  function startAuto() {
    intervalRef.current = setInterval(() => setIdx(i => (i + 1) % aspects.length), 4000)
  }

  // auto-rotate rings every 4s
  useEffect(() => {
    startAuto()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (resumeRef.current) clearTimeout(resumeRef.current)
    }
  }, [aspects.length])
  // reset pointer and scale when index changes
  useEffect(() => {
    setPointerScale(0.8)
    setSettled(false)
  }, [idx])

  function handleArrive() {
    setPointerScale(1.1)
    setSettled(true)
    setTimeout(() => setPointerScale(1), 600)
  }

  const order = ORDER[idx]

  return (
    <div className="relative w-[560px] h-[450px]">
      <svg className="absolute inset-0 z-0 pointer-events-none" viewBox="0 0 560 450">
        <path
          d={PATH_D}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={2}
          fill="none"
          strokeDasharray="6 10"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-32" dur="4s" repeatCount="indefinite" />
        </path>
      </svg>
      {aspects.map((a, i) => {
        const pos = POSITIONS[order[i]]
        const active = order[i] === 0
        function handleSelect() {
          if (active) {
            setIdx(prev => (prev + aspects.length - 1) % aspects.length)
          } else {
            setIdx(i)
          }
          if (intervalRef.current) clearInterval(intervalRef.current)
          if (resumeRef.current) clearTimeout(resumeRef.current)
          resumeRef.current = setTimeout(() => startAuto(), 10000)
        }
        return (
          <Fragment key={a.key}>
            <div
              className={`absolute w-32 h-32 text-center cursor-pointer ${active ? 'z-20' : 'z-10'}`}
              style={{
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -50%)',
                transition: 'left 0.7s ease, top 0.7s ease'
              }}
              onClick={handleSelect}
              onTransitionEnd={e => {
                if (active && e.propertyName === 'top') handleArrive()
              }}
            >
              <div
                className="relative w-full h-full rounded-full flex items-center justify-center transition-transform duration-700 overflow-visible"
                style={{ transform: `scale(${active && settled ? 1.25 : 1})` }}
              >
                <svg viewBox="0 0 100 100" className="absolute inset-0 overflow-visible">
                <circle cx="50" cy="50" r="45" stroke={a.color} strokeOpacity={0.2} strokeWidth={8} fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke={a.color}
                  strokeWidth={8}
                  fill="none"
                  pathLength={100}
                  strokeDasharray={`${a.pct} 100`}
                  strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 6px ${a.color})` }}
                />
              </svg>
              <div className="relative z-10 text-xl font-semibold">{a.pct}%</div>
              {active && (
                <svg
                  viewBox="0 0 140 140"
                  className="absolute -inset-8 animate-slow-spin overflow-visible"
                  style={{ filter: `drop-shadow(0 0 8px ${a.color})` }}
                >
                  <circle
                    cx="70"
                    cy="70"
                    r="66"
                    stroke={a.color}
                    strokeWidth={4}
                    fill="none"
                    strokeDasharray="8 8"
                  />
                </svg>
              )}
              </div>
            </div>
            {!active && (
              <div
                className="absolute text-base font-semibold text-zinc-300 whitespace-nowrap z-30"
                style={{ left: pos.x + 96, top: pos.y, transform: 'translateY(-50%)' }}
              >
                {a.label}
              </div>
            )}
          </Fragment>
        )
      })}
      <div
        className="absolute z-[60] pointer-events-none"
        style={{
          left: POINTER_POS.x,
          top: POINTER_POS.y,
          transform: `translate(-50%, -50%) scale(${pointerScale})`,
          transition: 'transform 0.6s ease'
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          className="pointer-events-none"
          style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8))' }}
        >
          <polygon points="40,20 0,0 0,40" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={3} />
          <polygon points="32,20 8,8 8,32" fill="rgba(255,255,255,0.9)" />
        </svg>
      </div>
      <div className="absolute bottom-4 left-0 w-80 text-left text-zinc-300">
        <div key={idx} className="animate-fade-large">
          <div className="text-5xl font-semibold mb-2">{aspects[idx].label}</div>
          <div className="text-2xl">{aspects[idx].comment}</div>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeLarge { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-large { animation: fadeLarge 0.7s ease; }
      `}</style>
    </div>
  )
}
