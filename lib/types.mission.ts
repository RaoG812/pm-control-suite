export type EvidenceRef = { filePath: string; startLine: number; endLine: number; commit: string };

export type IntegrationRow = {
  name: string;
  category:
    | 'Frontend'
    | 'Backend'
    | 'Database'
    | 'Infrastructure'
    | 'Security'
    | 'Observability'
    | 'Comms'
    | 'AI/ML';
  impact: number;
  security: number;
  ops: number;
  health: number;
  coupling: number;
  upgrade: number;
  evidence?: EvidenceRef[];
  logoUrl?: string;
};

export type Hotspot = {
  path: string;
  churnScore: number;
  prsLast14d: number;
  owners: string[];
};

export type ActionItem = {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  rationale: string;
  evidence?: EvidenceRef[];
};

export type OwnershipEntry = { area: string; owners: string[]; busFactor: number };

export type ServiceNode = {
  id: string;
  label: string;
  kind: 'svc' | 'db' | 'ext';
  latencyMs?: number;
  errorPct?: number;
};

export type ServiceEdge = { from: string; to: string };

export type PipelineStatus = {
  branch: string;
  lastRun: string;
  status: 'passing' | 'failing' | 'flaky';
  coveragePct: number;
  openPRs: number;
};

export type SecurityFinding = {
  kind: 'secret' | 'cve' | 'scope' | 'policy';
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence?: EvidenceRef[];
};

export type ApiEndpoint = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  auth: 'public' | 'user' | 'service';
  rateLimit?: string;
};

export type DocLink = {
  title: string;
  url: string;
  kind: 'ADR' | 'Runbook' | 'Onboarding' | 'Design';
};

export type CommitCategory =
  | 'Features'
  | 'Fixes'
  | 'Infra'
  | 'Refactor'
  | 'Testing'
  | 'Docs'
  | 'Security'
  | 'Data';

export type CommitMatrixRow = {
  category: CommitCategory;
  countLast7d: number;
  topExamples: string[];
};

export type Reliability = {
  coveragePct: number;
  evidenceCompletenessPct: number;
  llmStaticAgreementPct: number;
};

export type Pulse = {
  envs: string[];
  deploysToday: number;
  criticalAlerts: number;
};

export type DashboardData = {
  generatedAt: string;
  pulse: Pulse;
  integrationsTop10: IntegrationRow[];
  hotspots: Hotspot[];
  actions: ActionItem[];
  ownership: OwnershipEntry[];
  topology: { nodes: ServiceNode[]; edges: ServiceEdge[] };
  pipeline: PipelineStatus;
  security: SecurityFinding[];
  apiSurface: ApiEndpoint[];
  docs: DocLink[];
  commitMatrix: CommitMatrixRow[];
  reliability: Reliability;
};
