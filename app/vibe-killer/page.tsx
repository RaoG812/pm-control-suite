// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'
import HexBackground from '../../components/HexBackground'
import EvilEyes from '../../components/EvilEyes'

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-xl p-4 backdrop-blur-sm">
      {children}
    </div>
  )
}

function Bar({ value }: { value: number }) {
  return (
    <div className="w-full bg-zinc-800 rounded h-2">
      <div
        className="h-2 bg-emerald-500 rounded"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

function Gauge({ value }: { value: number }) {
  const radius = 30
  const circ = 2 * Math.PI * radius
  const offset = circ - (Math.min(100, Math.max(0, value)) / 100) * circ
  return (
    <svg width="80" height="80" className="mx-auto">
      <circle
        cx="40"
        cy="40"
        r={radius}
        strokeWidth="6"
        className="text-zinc-800"
        stroke="currentColor"
        fill="none"
      />
      <circle
        cx="40"
        cy="40"
        r={radius}
        strokeWidth="6"
        className="text-emerald-500"
        stroke="currentColor"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        fill="none"
      />
      <text x="40" y="45" textAnchor="middle" className="text-sm fill-white">
        {Math.round(Math.min(100, Math.max(0, value)))}%
      </text>
    </svg>
  )
}

function ImpactBadge({ level }: { level?: string }) {
  const colors: any = {
    low: 'bg-emerald-600',
    med: 'bg-yellow-600',
    high: 'bg-orange-600',
    critical: 'bg-rose-600'
  }
  const color = colors[level as keyof typeof colors] || 'bg-zinc-700'
  return <span className={`px-2 py-0.5 rounded text-[10px] ${color}`}>{level || 'low'}</span>
}

export default function VibeKillerPage() {
  const [files, setFiles] = useState<any[]>([])
  const [commits, setCommits] = useState<any[]>([])
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('main')

  useEffect(() => {
    const stored = localStorage.getItem('ingestResult')
    let parsed: any
    if (stored) {
      try {
        parsed = JSON.parse(stored)
        setFiles(parsed.code || [])
      } catch {}
    }
    const vr = localStorage.getItem('vibeResult')
    if (vr) {
      try {
        setResult(JSON.parse(vr))
      } catch {}
    }
    const r = (parsed && parsed.repo) || localStorage.getItem('repo') || ''
    const b = (parsed && parsed.branch) || localStorage.getItem('branch') || 'main'
    setRepo(r)
    setBranch(b)
  }, [])

  useEffect(() => {
    if (!repo) return
    fetch(`/api/github/commits?repo=${repo}&branch=${branch}`)
      .then(r => r.json())
      .then(d => setCommits(Array.isArray(d) ? d : []))
      .catch(() => setCommits([]))
  }, [repo, branch])

  async function runScan() {
    setLoading(true)
    try {
      const res = await fetch('/api/vibe-killer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, commits })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'scan failed')
      setResult(data)
      try {
        localStorage.setItem('vibeResult', JSON.stringify(data))
      } catch {}
      setError('')
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative overflow-hidden min-h-screen">
      <HexBackground className="hex-fade" reveal={false} />
      <EvilEyes />
      <div className="relative z-10 p-10 space-y-6 fade-in-fast">
        <div className="flex items-start justify-between">
          <div className="space-y-2 fade-in-fast">
            <Card>
              <button
                onClick={runScan}
                disabled={loading || files.length === 0}
                className="px-4 py-2 bg-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? 'Scanning...' : 'Scan Repo'}
              </button>
            </Card>
            {error && <div className="text-xs text-rose-400">{error}</div>}
          </div>
          <div className="text-right leading-tight space-y-1">
            <h1 className="text-5xl font-bold text-white">Vibe Killer</h1>
            <p className="text-sm text-white">Trace ai-relied coding</p>
          </div>
        </div>
        {result && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <div className="text-sm font-semibold mb-2">AI Presence</div>
                <Gauge value={(result.repo_summary?.percent_ai_repo || 0) * 100} />
              </Card>
              <Card>
                <div className="text-sm font-semibold mb-2">Files Scanned</div>
                <div className="text-2xl font-bold">
                  {result.repo_summary?.files_scanned || 0}
                </div>
              </Card>
              <Card>
                <div className="text-sm font-semibold mb-2">AI-Flagged Files</div>
                <div className="text-2xl font-bold">
                  {result.repo_summary?.ai_files || 0}
                </div>
              </Card>
              <Card>
                <div className="text-sm font-semibold mb-2">Avg Confidence</div>
                <Gauge
                  value={
                    ((result.files?.reduce(
                      (s: number, f: any) => s + (f.confidence || 0),
                      0
                    ) || 0) /
                      Math.max(result.files?.length || 1, 1)) *
                    100
                  }
                />
              </Card>
            </div>

            {result.repo_summary?.overview && (
              <Card>
                <div className="text-sm">{result.repo_summary.overview}</div>
                {result.repo_summary.notes?.length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-xs text-zinc-400">
                    {result.repo_summary.notes.map((n: string) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {result.files?.length > 0 && (
              <div>
                <h2 className="text-lg font-medium mb-2">Flagged Files</h2>
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="text-left text-zinc-400">
                      <tr>
                        <th className="p-2">Path</th>
                        <th className="p-2 w-32">Likelihood</th>
                        <th className="p-2 w-32">AI Lines</th>
                        <th className="p-2 w-24">Impact</th>
                        <th className="p-2 w-32">Confidence</th>
                        <th className="p-2 w-40">Signals</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...result.files]
                        .sort((a, b) => (b.ai_likelihood || 0) - (a.ai_likelihood || 0))
                        .slice(0, 5)
                        .map((f: any) => (
                          <tr key={f.path} className="border-t border-zinc-800">
                            <td className="p-2 truncate max-w-[200px]">{f.path}</td>
                            <td className="p-2">
                              <Bar value={(f.ai_likelihood || 0) * 100} />
                            </td>
                            <td className="p-2">
                              <Bar value={(f.percent_ai_lines || 0) * 100} />
                            </td>
                            <td className="p-2">
                              <ImpactBadge level={f.impact} />
                            </td>
                            <td className="p-2">
                              <Bar value={(f.confidence || 0) * 100} />
                            </td>
                            <td className="p-2 truncate max-w-[160px]">
                              {(f.top_signals || []).join(', ')}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result.commits?.length > 0 && (
              <div>
                <h2 className="text-lg font-medium mb-2">Flagged Commits</h2>
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="text-left text-zinc-400">
                      <tr>
                        <th className="p-2">Hash</th>
                        <th className="p-2 w-32">Likelihood</th>
                        <th className="p-2 w-32">AI Lines</th>
                        <th className="p-2 w-32">Confidence</th>
                        <th className="p-2 w-40">Signals</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...result.commits]
                        .sort((a, b) => (b.ai_likelihood || 0) - (a.ai_likelihood || 0))
                        .slice(0, 5)
                        .map((c: any) => (
                          <tr key={c.hash} className="border-t border-zinc-800">
                            <td className="p-2 truncate max-w-[200px]">{c.hash}</td>
                            <td className="p-2">
                              <Bar value={(c.ai_likelihood || 0) * 100} />
                            </td>
                            <td className="p-2">
                              <Bar value={(c.percent_ai_lines || 0) * 100} />
                            </td>
                            <td className="p-2">
                              <Bar value={(c.confidence || 0) * 100} />
                            </td>
                            <td className="p-2 truncate max-w-[160px]">
                              {(c.top_signals || []).join(', ')}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <details>
              <summary className="cursor-pointer text-xs text-zinc-400">Raw Output</summary>
              <pre className="mt-2 text-xs bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl max-h-[60vh] overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}
