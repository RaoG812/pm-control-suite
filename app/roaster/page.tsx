// @ts-nocheck
'use client'
import { useEffect, useState, CSSProperties, useRef, useSyncExternalStore } from 'react'
import Link from 'next/link'
import HexBackground from '../../components/HexBackground'
import { getRoasterState, setRoasterState } from '../../lib/roasterState'
import { getOintData, subscribeOintData } from '../../lib/toolsetState'

type Result = { files: string[]; docs: { name: string; type: string; content: string }[] }
type Comment = { department: string; comment: string; temperature: number }

const departments = ['frontend', 'backend', 'ops'] as const
type Department = typeof departments[number]

function TemperatureKnob({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const percent = Math.round(value * 100)
  const angle = value * 270 - 135
  const hue = 120 - value * 120
  const deg = value * 270
  return (
    <div className="relative w-32 h-32 select-none">
      <div className="absolute inset-0 rounded-full bg-zinc-800 shadow-inner shadow-black/40" />
      <div
        className="absolute inset-0 rounded-full transition-all"
        style={{
          background: `conic-gradient(from -135deg, hsl(${hue},80%,50%) ${deg}deg, #27272a ${deg}deg 360deg)`
        }}
      />
      <div className="absolute inset-[6px] rounded-full bg-black">
        <div
          className="absolute top-1/2 left-1/2 w-2 h-14 rounded-full"
          style={{
            transform: `translate(-50%, -100%) rotate(${angle}deg)`,
            transformOrigin: '50% 100%',
            background: `hsl(${hue},80%,50%)`,
            transition: 'transform 0.3s ease-out, background 0.3s ease-out'
          }}
        />
        <div className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-zinc-200 rounded-full" />
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={percent}
        onChange={e => onChange(parseInt(e.target.value) / 100)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </div>
  )
}

function Face({ level }: { level: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    function move(e: PointerEvent) {
      const rect = el.getBoundingClientRect()
      const scaleX = rect.width / el.offsetWidth || 1
      const scaleY = rect.height / el.offsetHeight || 1
      const x = (e.clientX - rect.left) / scaleX
      const y = (e.clientY - rect.top) / scaleY
      const inside = x >= 0 && x <= el.offsetWidth && y >= 0 && y <= el.offsetHeight
      if (inside) {
        el.style.setProperty('--mx', `${x}px`)
        el.style.setProperty('--my', `${y}px`)
      } else {
        el.style.setProperty('--mx', `-999px`)
        el.style.setProperty('--my', `-999px`)
      }
    }
    window.addEventListener('pointermove', move)
    return () => {
      window.removeEventListener('pointermove', move)
    }
  }, [])

  function eyePolygon(t: number) {
    const circle = [
      [50, 0],
      [80, 10],
      [100, 50],
      [80, 90],
      [50, 100],
      [20, 90],
      [0, 50],
      [20, 10]
    ]
    const triangle = [
      [50, 0],
      [50, 0],
      [100, 100],
      [100, 100],
      [50, 100],
      [0, 100],
      [0, 100],
      [50, 0]
    ]
    return circle
      .map((p, i) => {
        const q = triangle[i]
        const x = (p[0] + (q[0] - p[0]) * t).toFixed(1)
        const y = (p[1] + (q[1] - p[1]) * t).toFixed(1)
        return `${x}% ${y}%`
      })
      .join(', ')
  }

  const hue = 120 - level * 120
  const eyeT = Math.max((level - 0.66) / 0.34, 0)
  const mouthStyle: CSSProperties = (() => {
    if (level < 0.33) {
      const t = level / 0.33
      return {
        width: '120px',
        height: `${60 - 40 * t}px`,
        border: '8px solid #fff',
        borderTop: 'none',
        borderRadius: `0 0 ${120 - 80 * t}px ${120 - 80 * t}px`,
        bottom: `${82 - 20 * t}px`
      }
    } else if (level < 0.66) {
      const t = (level - 0.33) / 0.33
      return {
        width: '120px',
        height: `${8 + 20 * t}px`,
        background: '#fff',
        borderRadius: `${4 * (1 - t)}px`,
        bottom: `${100 - 40 * t}px`
      }
    } else {
      const t = (level - 0.66) / 0.34
      return {
        width: '120px',
        height: `${20 + 40 * t}px`,
        background: '#fff',
        clipPath: `polygon(10% 0, 90% 0, 100% 100%, 0 100%)`,
        bottom: `${40 - 10 * (1 - t)}px`
      }
    }
  })()

  return (
    <div
      ref={ref}
      className="relative w-[270px] h-[270px] pointer-events-none"
      style={{ '--mx': '-999px', '--my': '-999px' } as CSSProperties}
    >
      <div
        className="absolute inset-0 rounded-full overflow-hidden top-face"
        style={{ background: `radial-gradient(circle at 50% 35%, hsl(${hue},40%,30%), #000)` }}
      >
        <div
          className="eye left"
          style={{ clipPath: `polygon(${eyePolygon(eyeT)})` }}
        />
        <div
          className="eye right"
          style={{ clipPath: `polygon(${eyePolygon(eyeT)})` }}
        />
        <div className="mouth" style={mouthStyle} />
      </div>
      <div className="absolute inset-0 bot rounded-full pointer-events-none">
        <img src="/gpt5-face.svg" alt="GPT-5 circuit face" className="w-full h-full object-cover" />
      </div>
      <style jsx>{`
        .bot {
          background: radial-gradient(circle at 50% 35%, #1e1e1e, #000);
          position: absolute;
          overflow: hidden;
          mask: radial-gradient(circle 90px at var(--mx) var(--my), black 0 40px, transparent 60px);
          -webkit-mask: radial-gradient(circle 90px at var(--mx) var(--my), black 0 40px, transparent 60px);
          transition: mask 0.3s;
        }
        .bot img {
          filter: drop-shadow(0 0 10px rgba(59,130,246,0.3));
        }
        .top-face {
          transition: background 0.3s;
        }
        .eye {
          width: 36px;
          height: 36px;
          background: #fff;
          position: absolute;
          top: 82px;
          animation: blink 5s infinite;
          transition: clip-path 0.3s;
        }
        .eye.left { left: 82px; }
        .eye.right { right: 82px; }
        @keyframes blink {
          0%, 97%, 100% { transform: scaleY(1); }
          98%, 99% { transform: scaleY(0.1); }
        }
        .mouth {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          transition: all 0.3s;
        }
      `}</style>
    </div>
  )
}

function FireLayer() {
  const flames = Array.from({ length: 20 })
  return (
    <div className="fire-layer" aria-hidden="true">
      {flames.map((_, i) => (
        <span
          key={i}
          style={{
            left: `${(i / (flames.length - 1)) * 100}%`,
            animationDelay: `${i * 0.2}s`,
            animationDuration: `${3 + (i % 4)}s`
          }}
        />
      ))}
      <style jsx>{`
        .fire-layer {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          height: 200px;
          pointer-events: none;
          overflow: hidden;
          z-index: 5;
        }
        .fire-layer span {
          position: absolute;
          bottom: -40px;
          width: 100px;
          height: 100px;
          background: radial-gradient(circle at 50% 100%, rgba(255,160,0,0.6), transparent 70%);
          filter: blur(4px);
          transform-origin: 50% 100%;
          animation: ember ease-in-out infinite;
        }
        .fire-layer span::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          bottom: 0;
          background: inherit;
          transform: scaleY(-1);
          opacity: 0.35;
        }
        @keyframes ember {
          0%,100% {
            transform: translateY(0) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-40px) scale(1.2) translateX(-15px);
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  )
}


export default function RoasterPage() {
  const empty = departments.reduce(
    (acc, d) => ({ ...acc, [d]: { department: d, comment: 'Awaiting review', temperature: 0 } }),
    {} as Record<Department, Comment>
  )
  const init = getRoasterState()
  const [result, setResult] = useState<Result | null>(null)
  const [level, setLevel] = useState(init.level)
  const [roast, setRoast] = useState<Comment[] | null>(null)
  const [widgets, setWidgets] = useState<Record<Department, Comment>>(init.widgets)
  const [roasting, setRoasting] = useState(false)
  const [ointWidgets, setOintWidgets] = useState<Record<Department, Comment> | null>(init.ointWidgets)
  const [ointSteps, setOintSteps] = useState<string[]>(init.steps)
  const [fixing, setFixing] = useState(false)
  const [error, setError] = useState('')
  const [healed, setHealed] = useState(init.healed)
  const ointCreated = !!useSyncExternalStore(subscribeOintData, getOintData)

  useEffect(() => {
    const stored = localStorage.getItem('ingestResult')
    if (stored) setResult(JSON.parse(stored))
  }, [])

  useEffect(() => {
    setRoasterState({ level, widgets, ointWidgets, healed, steps: ointSteps })
  }, [level, widgets, ointWidgets, healed, ointSteps])

  async function runRoaster() {
    if (!result) return
    setHealed(false)
    setOintWidgets(null)
    setOintSteps([])
    setRoasting(true)
    try {
      const res = await fetch('/api/roaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: result.files, docs: result.docs, level })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'roaster failed')
      const comments = Array.isArray(data.comments) ? data.comments : []
      const updated = { ...empty }
      comments.forEach((c: Comment) => {
        const key = c.department.toLowerCase() as Department
        if (updated[key]) updated[key] = c
      })
      setWidgets(updated)
      setRoast(comments)
      localStorage.setItem('vulnChecked', 'true')
      setError('')
    } catch (err) {
      setRoast(null)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRoasting(false)
    }
  }

  async function applyOint() {
    if (!result || !roast) return
    setFixing(true)
    try {
      const res = await fetch('/api/oint/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roast })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'apply OINT failed')
      const updated = { ...empty }
      const comments = Array.isArray(data.comments) ? data.comments : []
      comments.forEach((c: Comment) => {
        const key = c.department.toLowerCase() as Department
        if (updated[key]) updated[key] = c
      })
      setOintWidgets(updated)
      const steps = Array.isArray(data.steps) ? data.steps : []
      setOintSteps(steps)
      setHealed(true)
      setError('')
    } catch (err) {
      setOintWidgets(null)
      setOintSteps([])
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setFixing(false)
    }
  }

  const temps = Object.values(widgets).map(w => w.temperature)
  const health = temps.length
    ? 100 - Math.round((temps.reduce((s, t) => s + t, 0) / temps.length) * 100)
    : 0

  const hue = 120 - level * 120
  const gradientStyle: CSSProperties = healed
    ? {
        background: 'radial-gradient(circle at 50% 50%, hsl(210,60%,20%), #000)',
        backgroundSize: '200% 200%',
        animation: 'bgMove 20s ease infinite',
        transition: 'background 0.5s',
        filter: 'blur(40px)'
      }
    : {
        background: `radial-gradient(circle at 50% 50%, hsl(${hue},60%,13%), #000)`,
        backgroundSize: '200% 200%',
        animation: 'bgMove 20s ease infinite',
        transition: 'background 0.5s',
        filter: 'blur(40px)'
      }

  return (
    <div className="relative overflow-hidden min-h-screen text-zinc-200 p-10">
      <HexBackground />
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0" style={gradientStyle} />
        <div className="absolute inset-0 bg-black/60" />
      </div>
      {level > 0.95 && <FireLayer />}
      <div
        className="absolute -bottom-40 -right-40 opacity-20 z-10 no-hex"
        aria-hidden="true"
        style={{ transform: 'scale(3)', transformOrigin: 'bottom right' }}
      >
        <Face level={level} />
      </div>
      <div className="relative z-30 space-y-8">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Roaster</h1>
          <div className="text-right leading-tight">
            <div className="text-5xl font-bold">Roaster v0.1.9</div>
            <div className="text-sm text-zinc-400">AI-powered code critique, assisting in project management</div>
          </div>
        </div>
        {ointCreated && (
          <Link href="/toolset" className="text-sm text-zinc-400 underline">
            Apply OINT
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-8">
          <TemperatureKnob value={level} onChange={setLevel} />
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Roast Temperature: {Math.round(level * 100)}%</div>
            <div className="text-xs text-zinc-400">Higher heat yields harsher criticism.</div>
            <div className="flex gap-2">
              <button
                onClick={runRoaster}
                className="px-4 py-2 bg-red-600 text-sm font-medium rounded-lg hover:bg-red-500 transition"
              >
                Roast!
              </button>
              <div className="flex flex-col items-start">
                <button
                  onClick={applyOint}
                  disabled={!ointCreated || !roast}
                  className={`px-4 py-2 bg-emerald-600 text-sm font-medium rounded-lg transition ${
                    ointCreated && roast ? 'hover:bg-emerald-500' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  Apply OINT
                </button>
                <Link href="/toolset" className="text-xs text-zinc-400 underline mt-1">
                  Create OINT
                </Link>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-4">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full bg-zinc-800" />
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: `conic-gradient(#10b981 ${health}%, transparent 0)` }}
              />
              <div className="absolute inset-2 bg-black rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">{health}</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Health</div>
              <div className="text-xs text-zinc-400">Overall project vitality</div>
            </div>
          </div>
        </div>
        {error && <div className="text-xs text-rose-400">{error}</div>}
        <div className="grid sm:grid-cols-3 gap-4">
          {departments.map(d => {
            const w = widgets[d]
            return (
              <div key={d} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold capitalize">{d}</span>
                  <span className="text-xs text-zinc-400">{Math.round(w.temperature * 100)}%</span>
                </div>
                <ul
                  className={`text-sm list-disc list-inside ${w.temperature > 0.66 ? 'text-rose-400' : w.temperature > 0.33 ? 'text-amber-300' : 'text-emerald-400'}`}
                >
                  {w.comment.split('\n').map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              <div className="h-1 bg-zinc-800 rounded-full mt-2">
                <div
                  className={`h-full rounded-full ${w.temperature > 0.66 ? 'bg-rose-500' : w.temperature > 0.33 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${w.temperature * 100}%` }}
                />
                </div>
              </div>
            )
          })}
        </div>
        {(roasting || fixing) && (
          <div className="flex items-center justify-center mt-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-500" />
          </div>
        )}
      </div>
      {ointWidgets && (
        <div className="mt-8">
          <div className="text-sm font-semibold mb-2">OINT Recommendations</div>
          <div className="grid sm:grid-cols-3 gap-4">
            {departments.map(d => {
              const w = ointWidgets[d]
              return (
                <div key={d} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold capitalize">{d}</span>
                    <span className="text-xs text-zinc-400">{Math.round(w.temperature * 100)}%</span>
                  </div>
                  <ul
                    className={`text-sm list-disc list-inside ${w.temperature > 0.66 ? 'text-rose-400' : w.temperature > 0.33 ? 'text-amber-300' : 'text-emerald-400'}`}
                  >
                    {w.comment.split('\n').map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                  <div className="h-1 bg-zinc-800 rounded-full mt-2">
                    <div
                      className={`h-full rounded-full ${w.temperature > 0.66 ? 'bg-rose-500' : w.temperature > 0.33 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${w.temperature * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {ointSteps.length > 0 && (
        <div className="mt-8">
          <div className="text-sm font-semibold mb-2">Action Plan</div>
          <ol className="space-y-2 text-sm text-zinc-300 list-decimal list-inside">
            {ointSteps.map(step => (
              <li
                key={step}
                className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg"
              >
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
      <style jsx>{`
        @keyframes bgMove {
          0% { background-position: 0 0; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0 0; }
        }
      `}</style>
    </div>
  )
}
