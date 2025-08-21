'use client'
import { useEffect, useState } from 'react'
import ApplyOintButton from '../../components/ApplyOintButton'
import IntegrationMatrix from '../../components/IntegrationMatrix'
import ReliabilityBars from '../../components/ReliabilityBars'
import { getStatus } from '../../lib/ointClient'
import { DashboardData } from '../../lib/types.mission'
import { Card, Pill, Metric, Button, severityColor } from '../../lib/ui'

export default function ToolsetPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = window.localStorage.getItem('OINT_STATE') as any
      if (cached) setStatus(cached)
    }
    getStatus().then(s => {
      setStatus(s.state)
      if (s.state === 'success') fetchSummary()
    })
  }, [])

  async function fetchSummary() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/mission-control/summary', { cache: 'no-store' })
      if (!res.ok) throw new Error('failed')
      const json = (await res.json()) as DashboardData
      setData(json)
    } catch (e) {
      setError('Failed to load summary')
    } finally {
      setLoading(false)
    }
  }

  if (status !== 'success') {
    return (
      <main className="p-6 flex flex-col items-center gap-4 text-center">
        <div className="text-zinc-400">Apply OINT to generate onboarding insights.</div>
        <ApplyOintButton onSuccess={() => { setStatus('success'); fetchSummary() }} />
      </main>
    )
  }

  if (loading && !data) return <main className="p-6">Loading...</main>
  if (error)
    return (
      <main className="p-6 space-y-4">
        <p className="text-red-400">{error}</p>
        <Button onClick={fetchSummary}>Retry</Button>
      </main>
    )

  return (
    <main className="p-6 space-y-6" aria-busy={loading}>
      {data && (
        <>
          <Card className="flex flex-wrap gap-6 justify-around">
            <Metric label="Envs" value={data.pulse.envs.join(', ')} />
            <Metric label="Deploys" value={data.pulse.deploysToday} />
            <Metric label="Coverage" value={`${data.pipeline.coveragePct}%`} />
            <Metric label="Open PRs" value={data.pipeline.openPRs} />
            <Metric label="Critical Alerts" value={data.pulse.criticalAlerts} />
          </Card>
          <div className="flex flex-wrap gap-2">
            {['Frontend','Backend','Database','Infrastructure','Security','Observability'].map(cat => (
              <Pill key={cat}>{cat}</Pill>
            ))}
            <Pill className="opacity-50">7d</Pill>
            <Pill className="opacity-50">14d</Pill>
            <Pill className="opacity-50">30d</Pill>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Card>
                <h2 className="font-semibold mb-2">Integration Matrix</h2>
                <IntegrationMatrix rows={data.integrationsTop10} />
              </Card>
              <Card>
                <h2 className="font-semibold mb-2">Change Hotspots</h2>
                <ul className="text-sm text-zinc-400 space-y-1">
                  {data.hotspots.map(h => (
                    <li key={h.path}>{h.path} – churn {Math.round(h.churnScore * 100)}%</li>
                  ))}
                </ul>
              </Card>
            </div>
            <div className="space-y-4">
              <Card>
                <h2 className="font-semibold mb-2">Risk & Actions</h2>
                <ul className="text-sm space-y-2">
                  {data.actions
                    .slice()
                    .sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))
                    .map(a => (
                      <li key={a.id} className={severityColor(a.severity)}>
                        {a.title}
                      </li>
                    ))}
                </ul>
              </Card>
              <Card>
                <h2 className="font-semibold mb-2">Ownership</h2>
                <ul className="text-sm text-zinc-400 space-y-1">
                  {data.ownership.map(o => (
                    <li key={o.area}>
                      {o.area}: {o.owners.join(', ')} (bus {o.busFactor})
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <h2 className="font-semibold mb-2">Topology</h2>
              <ul className="text-sm text-zinc-400 space-y-1">
                {data.topology.nodes.map(n => (
                  <li key={n.id}>
                    {n.label} ({n.kind})
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h2 className="font-semibold mb-2">Environment & CI</h2>
              <p className="text-sm text-zinc-400">Branch {data.pipeline.branch} — {data.pipeline.status}</p>
            </Card>
            <Card>
              <h2 className="font-semibold mb-2">Security & Compliance</h2>
              <ul className="text-sm space-y-1">
                {data.security.map((s, i) => (
                  <li key={i} className={severityColor(s.severity)}>
                    {s.title}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="md:col-span-2 lg:col-span-1">
              <h2 className="font-semibold mb-2">API Surface</h2>
              <ul className="text-sm text-zinc-400 space-y-1">
                {data.apiSurface.map((e, i) => (
                  <li key={i}>
                    {e.method} {e.path} ({e.auth})
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h2 className="font-semibold mb-2">Docs & Decisions</h2>
              <ul className="text-sm text-zinc-400 space-y-1">
                {data.docs.map((d, i) => (
                  <li key={i}>
                    {d.kind}: <a className="underline" href={d.url}>{d.title}</a>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h2 className="font-semibold mb-2">Commit Matrix</h2>
              <ul className="text-sm text-zinc-400 space-y-1">
                {data.commitMatrix.map((c, i) => (
                  <li key={i}>
                    {c.category}: {c.countLast7d}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h2 className="font-semibold mb-2">Reliability Gate</h2>
              <ReliabilityBars reliability={data.reliability} />
            </Card>
          </div>
        </>
      )}
    </main>
  )
}

function severityOrder(s: 'critical' | 'high' | 'medium' | 'low') {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s]
}
