// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'
import type { RepoAnalysis } from '../../lib/openai'
import HexBackground from '../../components/HexBackground'
import { OintCreationFlow } from '../../components/OintCreationFlow'
import DocsUploader from '../../components/DocsUploader'
import {
  getDocs as getDocsState,
  setDocs as setDocsState,
  type DocItem
} from '../../lib/docsState'
import { setOintData } from '../../lib/toolsetState'

type Result = {
  repo?: string
  branch?: string
  files: string[]
  analysis: RepoAnalysis
  code?: any[]
  docs: { name: string; type: string; content: string }[]
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-xl p-4 backdrop-blur-sm fade-in-fast">
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
    <svg viewBox="0 0 52 32" className="w-full h-auto overflow-visible">
      <path d="M2 30 A 24 24 0 0 1 50 30" stroke="#27272a" strokeWidth={4} fill="none" />
      <path
        d="M2 30 A 24 24 0 0 1 50 30"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        fill="none"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text x="26" y="26" textAnchor="middle" fontSize="8" fill="#a1a1aa">
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
  const [branch, setBranch] = useState('')
  const [repos, setRepos] = useState<string[]>([])
  const [reposError, setReposError] = useState('')
  const [error, setError] = useState('')
  const [docs, setDocs] = useState<(DocItem | null)[]>(getDocsState())
  const [hasVuln, setHasVuln] = useState(false)
  const [mode, setMode] = useState<'manual' | 'github'>('manual')
  const [localRepo, setLocalRepo] = useState('')
  const [branches, setBranches] = useState<string[]>([])

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
    if (storedRepo) setRepo(storedRepo)
    const storedLocal = localStorage.getItem('localRepo')
    if (storedLocal) setLocalRepo(storedLocal)
    const storedBranch = localStorage.getItem('ingestBranch')
    if (storedBranch) setBranch(storedBranch)
  }, [])

  useEffect(() => {
    if (repo) localStorage.setItem('repo', repo)
  }, [repo])

  useEffect(() => {
    if (branch) localStorage.setItem('ingestBranch', branch)
    else localStorage.removeItem('ingestBranch')
  }, [branch])

  useEffect(() => {
    if (!repo) {
      setBranches([])
      return
    }
    fetch(`/api/github/branches?repo=${repo}`)
      .then(r => r.json())
      .then(d => Array.isArray(d) && setBranches(d.map((x: any) => x.name)))
      .catch(() => setBranches([]))
  }, [repo])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const file = (e.currentTarget.elements.namedItem('file') as HTMLInputElement).files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    const docItems = docs.filter(Boolean) as DocItem[]
    docItems.forEach(d =>
      form.append('docs', new File([d.file], d.name, { type: d.file.type }))
    )
    form.append('docs_meta', JSON.stringify(docItems.map(d => ({ name: d.name, type: d.type }))))
    setShowConsole(true)
    setLoading(true)
    try {
      const res = await fetch('/api/ingest', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'analysis failed')
      setResult(data)
      setOintData(null)
      setLocalRepo(file.name)
      localStorage.setItem('ingestResult', JSON.stringify(data))
      localStorage.setItem('localRepo', file.name)
      if (repo) localStorage.setItem('repo', repo)
      if (repo) prefetchTracking(repo)

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

  function discardRepo() {
    setResult(null)
    setLocalRepo('')
    localStorage.removeItem('ingestResult')
    localStorage.removeItem('localRepo')
    setBranch('')
    localStorage.removeItem('ingestBranch')
    setOintData(null)
  }

  function handleRepoChange(value: string) {
    setRepo(value)
    setBranch('')
  }

  async function analyzeRepo() {
    if (!repo) return
    const form = new FormData()
    form.append('repo', repo)
    if (branch) form.append('branch', branch)
    const docItems = docs.filter(Boolean) as DocItem[]
    docItems.forEach(d =>
      form.append('docs', new File([d.file], d.name, { type: d.file.type }))
    )
    form.append('docs_meta', JSON.stringify(docItems.map(d => ({ name: d.name, type: d.type }))))
    setShowConsole(true)
    setLoading(true)
    try {
      const res = await fetch('/api/ingest', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'analysis failed')
      setResult(data)
      localStorage.setItem('ingestResult', JSON.stringify(data))
      if (repo) prefetchTracking(repo)

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

  function updateDocs(newDocs: (DocItem | null)[]) {
    setDocs(newDocs)
    setDocsState(newDocs)
  }

  useEffect(() => {
    const storedRepos = localStorage.getItem('repos')
    if (storedRepos) {
      try {
        const parsed = JSON.parse(storedRepos)
        if (Array.isArray(parsed)) setRepos(parsed)
      } catch {}
    }
    async function loadRepos() {
      const res = await fetch('/api/github/repos')
      if (res.status === 401) {
        setRepos([])
        setReposError('unauthorized')
        localStorage.removeItem('repos')
        return
      }
      const data = await (res.ok ? res.json() : [])
      if (Array.isArray(data)) {
        const names = data.map((r: any) => r.name)
        setRepos(names)
        setReposError('')
        localStorage.setItem('repos', JSON.stringify(names))
      } else {
        setRepos([])
        setReposError('failed')
        localStorage.removeItem('repos')
      }
    }
    if (mode === 'github') loadRepos()
  }, [mode])


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
      <div className="relative z-10 p-10 space-y-6 fade-in-fast">
        <h1 className="text-2xl font-semibold tracking-tight">Ingest</h1>
        <p className="text-sm text-zinc-400">Upload code and docs to prep the analyzers</p>
        <div className="flex flex-col md:flex-row md:gap-8">
          <div className="space-y-8 max-w-md">
            <DocsUploader docs={docs} setDocs={updateDocs} />
            <div className="flex gap-2 mb-4">
              <button
                className={`px-3 py-1 text-sm rounded-lg ${mode === 'manual' ? 'bg-zinc-700' : 'bg-zinc-800'}`}
                onClick={() => setMode('manual')}
              >
                Manual
              </button>
              <button
                className={`px-3 py-1 text-sm rounded-lg ${mode === 'github' ? 'bg-zinc-700' : 'bg-zinc-800'}`}
                onClick={() => setMode('github')}
              >
                GitHub
              </button>
            </div>
            {mode === 'manual' && (
              <section className="space-y-4">
                <h2 className="text-lg font-medium">Manual Ingest</h2>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Manual ZIP Upload</h3>
                  <form onSubmit={onSubmit} className="space-y-4">
                    <input
                      type="file"
                      name="file"
                      accept=".zip"
                      className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 text-sm font-medium rounded-lg hover:bg-emerald-500 transition"
                    >
                      Upload and Analyze
                    </button>
                  </form>
                  {localRepo && (
                    <div className="text-xs text-zinc-400">
                      Loaded {localRepo}{' '}
                      <button onClick={discardRepo} className="underline">
                        Discard
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}
            {mode === 'github' && (
              <section className="space-y-4">
                <h2 className="text-lg font-medium">GitHub Ingest</h2>
                <div className="space-y-2">
                  {repos.length > 0 && (
                    <select
                      value={repos.includes(repo) ? repo : ''}
                      onChange={e => handleRepoChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm"
                    >
                      <option value="">select repo</option>
                      {repos.map(r => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    placeholder="owner/repo"
                    value={repo}
                    onChange={e => handleRepoChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm"
                  />
                  {branches.length > 0 && (
                    <select
                      value={branch}
                      onChange={e => setBranch(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm"
                    >
                      <option value="">default branch</option>
                      {branches.map(b => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  )}
                  {repos.length === 0 ? (
                    <p className="text-xs text-zinc-400">
                      {reposError === 'unauthorized'
                        ? 'Login with GitHub to list repos or enter a public repo path.'
                        : 'Enter a public repo path (owner/repo).'}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400">
                      Select a repo or enter any public owner/repo path.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={analyzeRepo}
                  className="px-4 py-2 bg-emerald-600 text-sm font-medium rounded-lg hover:bg-emerald-500 transition"
                >
                  Analyze Repo
                </button>
              </section>
            )}
          </div>
          <div className="flex-none w-[560px] ml-auto mr-4">
            <OintCreationFlow
              docs={docs.filter(Boolean).map(d => ({ name: d!.name, type: d!.type }))}
              repo={!!result}
              roast={hasVuln}
            />
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
          <>
            {result.repo && (
              <div className="text-xs text-zinc-400 mb-2">
                Analyzed {result.repo}
                {result.branch ? `@${result.branch}` : ''}
              </div>
            )}
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
                  <div className="text-sm font-semibold mb-2 capitalize text-center">
                    {key}
                  </div>
                  <div className="w-full max-w-[150px] mx-auto">
                    <Gauge value={result.analysis.metrics[key]} />
                  </div>
                </Card>
              ))}
            </div>
          </>
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
