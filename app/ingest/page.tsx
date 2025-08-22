// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'
import type { RepoAnalysis } from '../../lib/openai'
import HexBackground from '../../components/HexBackground'
import { OintCreationFlow } from '../../components/OintCreationFlow'
import { getDocs as getDocsState, setDocs as setDocsState } from '../../lib/docsState'

type Result = { files: string[]; analysis: RepoAnalysis; code?: any[] }

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-xl p-4 backdrop-blur-sm">
      {children}
    </div>
  )
}

function Gauge({ value }: { value: number }) {
  const radius = 24
  const circumference = Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const color = value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <svg viewBox="0 0 52 26" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <path
        d="M2 24 A 24 24 0 0 1 50 24"
        stroke="#27272a"
        strokeWidth={4}
        fill="none"
      />
      <path
        d="M2 24 A 24 24 0 0 1 50 24"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        fill="none"
      />
      <text
        x="26"
        y="22"
        textAnchor="middle"
        fontSize="8"
        fill="#a1a1aa"
      >
        {value}%
      </text>
    </svg>
  )
}

export default function IngestPage() {
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  // hide console by default; users can reveal as needed
  const [showConsole, setShowConsole] = useState(false)
  const [repo, setRepo] = useState('')
  const [branches, setBranches] = useState<string[]>([])
  const [branch, setBranch] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [docs, setDocs] = useState<File[]>(getDocsState())
  const [hasVuln, setHasVuln] = useState(false)

  useEffect(() => {
    setHasVuln(localStorage.getItem('vulnChecked') === 'true')
  }, [])

  async function prefetchTracking(repo: string) {
    try {
      const brRes = await fetch(`/api/github/branches?repo=${repo}`)
      const brData = await (brRes.ok ? brRes.json() : [])
      if (!Array.isArray(brData)) return
      const names = brData.map((d: any) => d.name)
      const offsets: Record<string, { x: number; y: number; z: number }> = {}
      brData.forEach((d: any) => {
        offsets[d.name] = d.offset || { x: 0, y: 0, z: 0 }
      })
      const entries = await Promise.all(
        names.map(async b => {
          const r = await fetch(`/api/github/commits?repo=${repo}&branch=${b}`)
          const j = await r.json()
          return [b, Array.isArray(j) ? j : []]
        })
      )
      localStorage.setItem(
        'trackingData',
        JSON.stringify({ branches: names, offsets, data: Object.fromEntries(entries) })
      )
    } catch {
      /* ignore prefetch errors */
    }
  }


  useEffect(() => {
    const stored = localStorage.getItem('ingestResult')
    if (stored) setResult(JSON.parse(stored))
    const storedRepo = localStorage.getItem('repo')
    const storedBranch = localStorage.getItem('branch')
    if (storedRepo) setRepo(storedRepo)
    if (storedBranch) setBranch(storedBranch)
  }, [])

  useEffect(() => {
    if (repo) localStorage.setItem('repo', repo)
  }, [repo])
  useEffect(() => {
    if (branch) localStorage.setItem('branch', branch)
  }, [branch])

  async function loadBranches() {
    if (!repo) return
    const res = await fetch(`/api/github/branches?repo=${repo}`)
    const data = await (res.ok ? res.json() : Promise.resolve([]))
    if (Array.isArray(data)) {
      setBranches(data.map((d: any) => d.name))
    } else {
      setBranches([])
    }
  }

  async function analyze() {
    if (!file && (!repo || !branch)) return
    const form = new FormData()
    if (file) {
      form.append('file', file)
    } else {
      form.append('repo', repo)
      form.append('branch', branch)
    }
    setShowConsole(true)
    setLoading(true)
    try {
      const res = await fetch('/api/ingest', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'analysis failed')
      setResult(data)
      localStorage.setItem('ingestResult', JSON.stringify(data))
      if (repo && !file) {
        localStorage.setItem('repo', repo)
        localStorage.setItem('branch', branch)
        prefetchTracking(repo)
      }
      setError('')
    } catch (err) {
      console.error(err)
      setResult(null)
      localStorage.removeItem('ingestResult')
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  function onDocsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 5)
    setDocs(files)
    setDocsState(files)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    if (f) {
      setRepo('')
      setBranch('')
      setBranches([])
    }
    setFile(f)
  }

  const canAnalyze = !!file || (repo && branch)


  return (
    <div className="relative min-h-screen text-zinc-200">
      <HexBackground className="-z-20" />
      <div className="fixed inset-0 -z-30">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(at 25% 25%, rgba(16,185,129,0.4), transparent 60%), radial-gradient(at 75% 25%, rgba(14,165,233,0.4), transparent 60%), radial-gradient(at 50% 75%, rgba(255,255,255,0.2), transparent 70%)',
            backgroundSize: '200% 200%',
            animation: 'bgMove 20s ease infinite',
            filter: 'blur(40px)'
          }}
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>
      <div className="relative z-10 p-10 space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Manual Ingest</h1>
        <div className="flex flex-col md:flex-row md:gap-8">
          <div className="space-y-8 max-w-md">
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Supporting Documents</h2>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx,.csv"
                onChange={onDocsChange}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
              />
              <p className="text-xs text-zinc-400">{docs.length}/5 files selected</p>
            </section>
            <section className="space-y-4">
              <h2 className="text-lg font-medium">GitHub Repository</h2>
              <div className="flex gap-2">
                <input
                  value={repo}
                  onChange={e => {
                    setRepo(e.target.value)
                    if (file) setFile(null)
                  }}
                  placeholder="owner/repo"
                  disabled={!!file}
                  className="flex-1 px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-sm disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={loadBranches}
                  disabled={!repo || !!file}
                  className="px-3 py-2 bg-zinc-800 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Load
                </button>
              </div>
              {branches.length > 0 && (
                <select
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  disabled={!!file}
                  className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-sm disabled:opacity-50"
                >
                  <option value="">select branch</option>
                  {branches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              )}
            </section>
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Manual ZIP Upload</h2>
              <input
                type="file"
                accept=".zip"
                onChange={onFileChange}
                disabled={!!repo || !!branch}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 disabled:opacity-50"
              />
            </section>
            <button
              type="button"
              onClick={analyze}
              disabled={!canAnalyze || loading}
              className="px-4 py-2 bg-emerald-600 text-sm font-medium rounded-lg hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload and Analyze
            </button>
          </div>
          <div className="flex-none w-[560px] ml-auto mr-4">
            <OintCreationFlow docs={docs.length} repo={!!result} roast={hasVuln} />
          </div>
        </div>
        <button
          onClick={() => setShowConsole(s => !s)}
          className="text-xs text-zinc-400 hover:text-zinc-200 transition"
        >
          {showConsole ? 'Hide' : 'Show'} Console
        </button>
      {error && <div className="text-xs text-rose-400">{error}</div>}
      {showConsole && (
        <div className="relative">
          <pre className="text-xs bg-zinc-900 p-4 rounded-xl overflow-auto max-h-96 min-h-[200px]">
            {result ? JSON.stringify(result, null, 2) : ''}
          </pre>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-500" />
            </div>
          )}
        </div>
      )}

        {result && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <div className="text-sm font-semibold mb-2">Takeaways</div>
              <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1">
                {result.analysis.takeaways.map(t => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </Card>
            {(['complexity', 'documentation', 'tests'] as const).map(key => (
              <Card key={key}>
                <div className="text-sm font-semibold mb-2 capitalize">{key}</div>
                <div className="max-w-[100px] mx-auto">
                  <Gauge value={result.analysis.metrics[key]} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
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
