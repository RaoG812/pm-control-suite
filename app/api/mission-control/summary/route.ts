import { NextResponse } from 'next/server'
import { oint } from '../../oint/state'
import { DashboardData } from '../../../../lib/types.mission'

const data: DashboardData = {
  generatedAt: '2024-05-01T12:00:00Z',
  pulse: { envs: ['staging', 'prod'], deploysToday: 2, criticalAlerts: 1 },
  integrationsTop10: [
    { name: 'Next.js', category: 'Frontend', impact: 90, security: 85, ops: 80, health: 95, coupling: 40, upgrade: 70, logoUrl: '/logos/nextjs.svg' },
    { name: 'Supabase', category: 'Backend', impact: 88, security: 70, ops: 60, health: 80, coupling: 50, upgrade: 65, logoUrl: '/logos/supabase.svg' },
    { name: 'Redis', category: 'Database', impact: 80, security: 60, ops: 75, health: 85, coupling: 55, upgrade: 60, logoUrl: '/logos/redis.svg' },
    { name: 'Sentry', category: 'Observability', impact: 78, security: 75, ops: 80, health: 90, coupling: 30, upgrade: 72, logoUrl: '/logos/sentry.svg' }
  ],
  hotspots: [
    { path: 'components/LegacyForm.tsx', churnScore: 0.8, prsLast14d: 4, owners: ['alice', 'bob'] },
    { path: 'lib/api.ts', churnScore: 0.6, prsLast14d: 2, owners: ['carol'] },
    { path: 'pages/api/upload.ts', churnScore: 0.5, prsLast14d: 1, owners: ['dan'] }
  ],
  actions: [
    { id: '1', title: 'Upgrade Next.js to latest', severity: 'medium', rationale: 'Stay current for security', evidence: [{ filePath: 'package.json', startLine: 1, endLine: 20, commit: 'abc123' }] },
    { id: '2', title: 'Add Redis persistence', severity: 'high', rationale: 'Avoid data loss' },
    { id: '3', title: 'Configure Sentry release tracking', severity: 'medium', rationale: 'Improve monitoring' },
    { id: '4', title: 'Review Supabase auth rules', severity: 'high', rationale: 'Potential broad access' },
    { id: '5', title: 'Document deployment runbook', severity: 'low', rationale: 'Ease onboarding' },
    { id: '6', title: 'Set up CI coverage thresholds', severity: 'medium', rationale: 'Reliability improvement' }
  ],
  ownership: [
    { area: 'Frontend', owners: ['alice', 'bob'], busFactor: 2 },
    { area: 'Backend', owners: ['carol'], busFactor: 1 },
    { area: 'Database', owners: ['dan', 'ellen'], busFactor: 2 },
    { area: 'Infra', owners: ['frank'], busFactor: 1 },
    { area: 'Security', owners: ['grace'], busFactor: 1 }
  ],
  topology: {
    nodes: [
      { id: 'web', label: 'Web', kind: 'svc', latencyMs: 120, errorPct: 0.02 },
      { id: 'api', label: 'API', kind: 'svc', latencyMs: 150, errorPct: 0.01 },
      { id: 'db', label: 'Postgres', kind: 'db' },
      { id: 'redis', label: 'Redis', kind: 'db' },
      { id: 'ext', label: 'Sentry', kind: 'ext' }
    ],
    edges: [
      { from: 'web', to: 'api' },
      { from: 'api', to: 'db' },
      { from: 'api', to: 'redis' },
      { from: 'api', to: 'ext' }
    ]
  },
  pipeline: { branch: 'main', lastRun: '2024-05-01', status: 'passing', coveragePct: 92, openPRs: 3 },
  security: [
    { kind: 'secret', title: 'Potential API key committed', severity: 'high', evidence: [{ filePath: 'lib/api.ts', startLine: 1, endLine: 20, commit: 'def456' }] },
    { kind: 'cve', title: 'Outdated dependency', severity: 'medium' }
  ],
  apiSurface: [
    { method: 'GET', path: '/api/health', auth: 'public' },
    { method: 'POST', path: '/api/login', auth: 'user', rateLimit: '60/m' },
    { method: 'GET', path: '/api/data', auth: 'service' }
  ],
  docs: [
    { title: 'Architecture Decision Record', url: '#', kind: 'ADR' },
    { title: 'Onboarding Guide', url: '#', kind: 'Onboarding' },
    { title: 'Runbook: Deploy', url: '#', kind: 'Runbook' }
  ],
  commitMatrix: [
    { category: 'Features', countLast7d: 4, topExamples: ['Add login', 'Add signup'] },
    { category: 'Fixes', countLast7d: 2, topExamples: ['Fix auth'] },
    { category: 'Infra', countLast7d: 1, topExamples: ['Add Docker'] },
    { category: 'Refactor', countLast7d: 1, topExamples: ['Refactor api'] },
    { category: 'Testing', countLast7d: 3, topExamples: ['Add tests'] },
    { category: 'Docs', countLast7d: 1, topExamples: ['Update readme'] },
    { category: 'Security', countLast7d: 0, topExamples: [] },
    { category: 'Data', countLast7d: 0, topExamples: [] }
  ],
  reliability: { coveragePct: 96, evidenceCompletenessPct: 88, llmStaticAgreementPct: 92 }
}

export async function GET() {
  if (oint.state !== 'success') {
    return NextResponse.json({ error: 'OINT not applied' }, { status: 403 })
  }
  return NextResponse.json(data)
}
