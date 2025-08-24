// @ts-nocheck
import OpenAI from 'openai'

export interface RepoAnalysis {
  overview: string
  takeaways: string[]
  metrics: {
    complexity: number
    documentation: number
    tests: number
  }
}

export interface RoastComment {
  department: string
  comment: string
  temperature: number
}

// Suggestions for improvements ordered by priority
export interface FixSuggestion {
  suggestions: string[]
}

// Create a client that can talk to AIMLAPI when AIML_API_KEY is provided.
// Otherwise, it falls back to the standard OpenAI endpoint using OPENAI_API_KEY.
const apiKey = process.env.AIML_API_KEY || process.env.OPENAI_API_KEY
const baseURL = process.env.AIML_API_KEY
  ? process.env.AIML_API_BASE_URL || 'https://api.aimlapi.com/v1'
  : process.env.OPENAI_BASE_URL

const client = new OpenAI({ apiKey, baseURL })

async function chat(
  messages: any[],
  response_format: any,
  models?: string | string[]
) {
  if (!apiKey) throw new Error('LLM API key missing')
  const base = Array.isArray(models)
    ? models.flatMap(m =>
        m && m.startsWith('gpt-5')
          ? [
              'gpt-5-2025-08-07',
              'gpt-5-mini-2025-08-07',
              'gpt-5-nano-2025-08-07',
              'gpt-5-chat-latest'
            ]
          : [m]
      )
    : (() => {
        const m = models || process.env.LLM_MODEL || 'gpt-5';
        return m.startsWith('gpt-5')
          ? [
              'gpt-5-2025-08-07',
              'gpt-5-mini-2025-08-07',
              'gpt-5-nano-2025-08-07',
              'gpt-5-chat-latest'
            ]
          : [m];
      })()
  const modelList = [...base, 'gpt-4o'].filter((v, i, a) => a.indexOf(v) === i)
  let lastErr: any
  for (let i = 0; i < modelList.length; i++) {
    const m = modelList[i]
    try {
      const res = await client.chat.completions.create({
        model: m,
        messages,
        reasoning: m.startsWith('gpt-5')
          ? (({ effort: 'medium' } as unknown) as any)
          : undefined,
        response_format
      } as any)
      if (i > 0) {
        console.warn(`LLM model fallback: using ${m} after ${modelList[i - 1]} failed`)
      }
      return res.choices[0]?.message?.content ?? '{}'
    } catch (err) {
      console.error(`LLM model ${m} failed`, err)
      lastErr = err
    }
  }
  const status = lastErr?.status || lastErr?.response?.status
  const body = lastErr?.response?.data
  const detail = status
    ? `${status}${body ? ` ${JSON.stringify(body)}` : ''}`
    : lastErr?.message
  console.error('LLM analysis failed', lastErr)
  throw new Error(`LLM analysis failed: ${detail}`)
}

export async function summarizeRepo(
  fileList: string[],
  docs: { name: string; type: string; content: string }[] = []
): Promise<RepoAnalysis> {
  // Large repositories can exceed token limits; only send the first 200 entries
  const filesPart = fileList.slice(0, 200).join('\n')
  const docsPart = docs
    .map(d => `${d.type.toUpperCase()} (${d.name}):\n${d.content}`)
    .join('\n---\n')
  const content = `FILES:\n${filesPart}\nDOCS:\n${docsPart}`
  const messages: any = [
    {
      role: 'system',
      content:
        'Summarize the repository file list and supporting documents (PRD, estimates). Respond with JSON of shape {"overview":string,"takeaways":string[],"metrics":{"complexity":number,"documentation":number,"tests":number}}. Values are 0-100. No extra text.'
    },
    { role: 'user', content }
  ]

  const txt = await chat(messages, { type: 'json_object' }, 'gpt-5-chat')
  return JSON.parse(txt)
}

export async function roastRepo(
  fileList: string[],
  docs: { name: string; type: string; content: string }[] = [],
  level = 0.5
): Promise<RoastComment[]> {
  const filesPart = fileList.slice(0, 200).join('\n')
  const docsPart = docs
    .map(d => `${d.type.toUpperCase()} (${d.name}):\n${d.content}`)
    .join('\n---\n')
  const content = `FILES:\n${filesPart}\nDOCS:\n${docsPart}`
  const messages: any = [
    {
      role: 'system',
      content:
        `Provide a concise code review for each department (frontend, backend, ops) using criticism level ${level} (0=gently, 1=brutal). Criticism level affects tone only\u2014always report all real issues found and never invent problems. Base all feedback strictly on the provided files and documents. Respond with JSON {"reviews":[{"department":string,"comment":string,"temperature":number}]}. The comment must be a bullet list (use "- " for each item) targeted to that department. If no issues exist, include "- No significant issues found". Temperature is between 0 and 1 indicating criticism level.`
    },
    { role: 'user', content }
  ]
  const txt = await chat(messages, { type: 'json_object' }, 'gpt-5-chat')
  try {
    const parsed = JSON.parse(txt)
    return Array.isArray(parsed.reviews) ? parsed.reviews : []
  } catch {
    return []
  }
}

export async function applyOint(
  roast: RoastComment[],
  fileList: string[] = [],
  docs: { name: string; text: string }[] = [],
  code: { path: string; content: string }[] = []
): Promise<{ comments: RoastComment[]; steps: string[] }> {
  const roastPart = roast
    .map(r => `${r.department.toUpperCase()}:\n${r.comment}`)
    .join('\n---\n')
  const filesPart = fileList.slice(0, 200).join('\n')
  const docsPart = docs
    .map(d => `DOC (${d.name}):\n${d.text}`)
    .join('\n---\n')
  const codePart = code
    .slice(0, 20)
    .map(f => `FILE (${f.path}):\n${f.content.slice(0, 2000)}`)
    .join('\n---\n')
  const content = `ROAST:\n${roastPart}\nFILES:\n${filesPart}\nDOCS:\n${docsPart}\nCODE:\n${codePart}`
  const messages: any = [
    {
      role: 'system',
      content:
        'Using the roast findings plus repository file list, docs and code, draft refined recommendations for each department and up to 8 actionable steps. Respond with JSON {"comments":[{"department":string,"comment":string,"temperature":number}],"steps":string[]}. Only reference provided docs or files. No extra text.'
    },
    { role: 'user', content }
  ]
  const txt = await chat(messages, { type: 'json_object' }, 'gpt-5-chat')
  try {
    const parsed = JSON.parse(txt)
    const comments = Array.isArray(parsed.comments) ? parsed.comments : []
    const steps = Array.isArray(parsed.steps) ? parsed.steps : []
    return { comments, steps }
  } catch {
    return { comments: [], steps: [] }
  }
}

export async function suggestFixes(fileList: string[]): Promise<string[]> {
  const content = fileList.slice(0, 200).join('\n')
  const messages: any = [
    {
      role: 'system',
      content:
        'From the repository file list, propose the most impactful improvements the team should address first. Respond with JSON {"suggestions":string[]} of up to 3 concise items.'
    },
    { role: 'user', content }
  ]

  const txt = await chat(messages, { type: 'json_object' }, 'gpt-5-chat')
  try {
    const parsed = JSON.parse(txt)
    return Array.isArray(parsed.suggestions) ? parsed.suggestions : []
  } catch {
    return []
  }
}

// Categorize commit messages into domain (frontend/backend/db/other) and
// type (feature/fix/infra/refactor/test/docs/security/data).
export async function categorizeCommits(
  messages: string[]
): Promise<{ domain: string; type: string }[]> {
  const prompt = messages.map((m, i) => `${i + 1}. ${m}`).join('\n')
  const txt = await chat(
    [
      {
        role: 'system',
        content:
          'For each commit message, classify two ways: "domain" from [frontend, backend, db, other] and "type" from [feature, fix, infra, refactor, test, docs, security, data]. Respond with JSON {"domains": string[], "types": string[]} in the same order as given messages.'
      },
      { role: 'user', content: prompt }
    ],
    { type: 'json_object' },
    'gpt-5-chat'
  )
  try {
    const parsed = JSON.parse(txt)
    const domains = Array.isArray(parsed.domains) ? parsed.domains : []
    const types = Array.isArray(parsed.types) ? parsed.types : []
    return messages.map((_, i) => ({
      domain: domains[i] || 'other',
      type: types[i] || 'other'
    }))
  } catch {
    return messages.map(() => ({ domain: 'other', type: 'other' }))
  }
}

// Generate small jitter offsets for commits so the 3D view can distribute
// spheres organically. Returns arrays of x, y and z offsets in the same order
// as the provided commit messages. Values are in the range [-1,1].
export async function jitterOffsets(
  messages: string[]
): Promise<{ x: number; y: number; z: number }[]> {
  const prompt = messages.map((m, i) => `${i + 1}. ${m}`).join('\n')
  const txt = await chat(
    [
      {
        role: 'system',
        content:
          'For each commit message return three arrays {"xs":number[],"ys":number[],"zs":number[]} where each value is a float between -1 and 1 representing small offsets for the x, y and z axes. Output JSON only.'
      },
      { role: 'user', content: prompt }
    ],
    { type: 'json_object' },
    'gpt-5-chat'
  )
  try {
    const parsed = JSON.parse(txt)
    const xs = Array.isArray(parsed.xs) ? parsed.xs : []
    const ys = Array.isArray(parsed.ys) ? parsed.ys : []
    const zs = Array.isArray(parsed.zs) ? parsed.zs : []
    return messages.map((_, i) => ({
      x: typeof xs[i] === 'number' ? xs[i] : 0,
      y: typeof ys[i] === 'number' ? ys[i] : 0,
      z: typeof zs[i] === 'number' ? zs[i] : 0
    }))
  } catch {
    return messages.map(() => ({ x: 0, y: 0, z: 0 }))
  }
}

// Detect artifacts of AI-assisted coding within a repository. The model scans
// provided files and commit metadata and returns JSON describing any signals of
// AI-generated code.
const VIBE_KILLER_SYSTEM = `System (Vibe Killer – AI Code Artifact Detector)

You analyze a repository to detect artifacts of AI-assisted coding (e.g., GitHub Copilot/Codex/ChatGPT/CodeWhisperer/Tabnine). Work deterministically, use only provided inputs (manual ingestion/public repo), and return strict JSON per the schema. If unsure, leave fields empty rather than guessing.

Inputs

files[]: {path, language, content}
commits[]: {hash, author, ts, message, changed_paths[]}
(optional) diffs[]: {hash, path, patch}
(optional) history_by_path[path]: prior contents/owners

Signals (score each when present)

Commit linguistics: long explanatory prose; "This commit …"; bullet diffs; generic/templated phrasing; sudden uniform style.
Metadata anomalies: bursty commits; unusual hours; many unrelated changes per commit (if diffs provided).
Comment smells: tutorial/obvious comments, dense line-by-line narration, first-person/assistant tone, placeholder headers.
Naming/format stylometry: overly generic identifiers; hyper-uniform style deviating from project norms; identical idioms across new blocks.
Boilerplate/repetition: near-duplicate blocks/functions; cookie-cutter files; unnecessary scaffolding.
Structure/pattern jumps: advanced patterns mixed with brute-force logic; sudden layered architecture unlike prior code.
Edge-case overreach: defensive checks far beyond context; exhaustive guards atypical for team history.
Explicit markers: "generated by …", "copilot", "chatgpt", "codewhisperer", license attributions.
Similarity hints (no web calls): exact/near-exact repeats elsewhere in repo/history; new code style not seen before in project.

Scoring

Compute ai_likelihood ∈ [0,1] per file and per commit from weighted signals.
Compute percent_ai_lines per file/commit (lines touched that are AI-likely / total lines touched).
Derive impact ∈ {low,med,high,critical} from location (e.g., core modules), churn, coupling.
Provide confidence ∈ [0,1] reflecting evidence strength and signal agreement.

Output (strict JSON)
{
  "repo_summary": {
    "percent_ai_repo": 0.0,
    "files_scanned": 0,
    "ai_files": 0,
    "notes": []
  },
  "files": [
    {
      "path": "string",
      "ai_likelihood": 0.0,
      "percent_ai_lines": 0.0,
      "impact": "low|med|high|critical",
      "confidence": 0.0,
      "top_signals": ["commit_linguistics","comment_smells","naming_stylometry"],
      "evidence": [
        {
          "type": "comment|naming|duplicate|marker|diff|commit",
          "summary": "concise why flagged",
          "loc": {"start_line": 0, "end_line": 0},
          "commit": "hash-or-empty"
        }
      ]
    }
  ],
  "commits": [
    {
      "hash": "string",
      "ai_likelihood": 0.0,
      "percent_ai_lines": 0.0,
      "confidence": 0.0,
      "top_signals": ["commit_linguistics","metadata_anomaly"],
      "evidence": [
        {"type":"message","summary":"template-like prose","snippet":"first 160 chars"}
      ]
    }
  ]
}

Procedure

Build project baseline: style/naming/comment density distributions from older files; owners per path.
Score commit messages (linguistics/template cues) and diff scope (if provided).
For each file: detect comment smells, naming/format stylometry drift, repetition/duplicates, explicit markers, structure jumps, edge-case overreach.
Aggregate per file & commit; compute repo totals; fill JSON.

No hallucinations: if a signal is not clearly present, do not claim it. Prefer fewer, stronger signals with concrete evidence.

Constraints

No network calls.
Deterministic ordering: sort outputs by descending ai_likelihood, then path/hash.
Keep summary fields ≤ 140 chars.
If nothing detected, return zeros and empty arrays with notes: ["no_ai_artifacts_detected"].
Return only the JSON object.`

function scanMarkers(content: string) {
  const markers = ['generated by', 'chatgpt', 'copilot', 'codewhisperer', 'tabnine']
  const lines = (content || '').toLowerCase().split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    for (const m of markers) {
      if (lines[i].includes(m)) {
        return {
          type: 'marker',
          summary: `contains "${m}"`,
          loc: { start_line: i + 1, end_line: i + 1 },
          commit: ''
        }
      }
    }
  }
  return null
}

function scanFileHeuristics(path: string, content: string) {
  const lines = (content || '').split(/\r?\n/)
  let commentLines = 0
  const evidence: any[] = []
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (/^(\/\/|#)/.test(trimmed) || trimmed.startsWith('/*')) {
      commentLines++
      if (/\bthis function\b|\badds\b|\breturns\b|\bcalculates\b/i.test(trimmed)) {
        evidence.push({
          type: 'comment',
          summary: 'tutorial-style comment',
          loc: { start_line: i + 1, end_line: i + 1 },
          commit: ''
        })
      }
    }
    if (/\b(temp|result|data|value|foo|bar)\d*\b/i.test(trimmed)) {
      evidence.push({
        type: 'naming',
        summary: 'generic identifier',
        loc: { start_line: i + 1, end_line: i + 1 },
        commit: ''
      })
    }
  }
  const density = lines.length ? commentLines / lines.length : 0
  if (evidence.length > 0 || density > 0.4) {
    const signals = Array.from(new Set(evidence.map(e => (e.type === 'comment' ? 'comment_smells' : 'naming_stylometry'))))
    return {
      path,
      ai_likelihood: 0.6 + (density > 0.4 ? 0.1 : 0),
      percent_ai_lines: Math.min(1, (evidence.length || 1) / lines.length),
      impact: 'low',
      confidence: 0.5 + (signals.length > 1 ? 0.1 : 0),
      top_signals: signals,
      evidence
    }
  }
  return null
}

function scanCommitLinguistics(commit: any) {
  const msg = commit?.message || ''
  const lower = msg.toLowerCase()
  const evidences: any[] = []
  if (lower.startsWith('this commit') || msg.length > 120 || /\n[-*]/.test(msg)) {
    evidences.push({
      type: 'message',
      summary: 'template-like commit message',
      snippet: msg.slice(0, 160)
    })
  }
  if (evidences.length > 0) {
    return {
      hash: commit.hash,
      ai_likelihood: 0.6,
      percent_ai_lines: 0,
      confidence: 0.5,
      top_signals: ['commit_linguistics'],
      evidence: evidences
    }
  }
  return null
}

async function detectAiArtifactsBatch(
  files: any[],
  commits: any[]
): Promise<any> {
  const limited = {
    files: files.slice(0, 200).map(f => ({
      path: f.path,
      language: f.language,
      content: (f.content || '').slice(0, 2000)
    })),
    commits: commits.slice(0, 200)
  }
  const messages: any = [
    {
      role: 'system',
      content: VIBE_KILLER_SYSTEM
    },
    {
      role: 'user',
      content: JSON.stringify(limited)
    }
  ]

  const txt = await chat(messages, { type: 'json_object' }, 'gpt-5-chat')
  try {
    const parsed = JSON.parse(txt)
    const fs = Array.isArray(parsed.files) ? parsed.files : []
    const summary = parsed.repo_summary || {}
    if (!summary.files_scanned) summary.files_scanned = fs.length
    if (summary.ai_files == null)
      summary.ai_files = fs.filter((f: any) => (f.ai_likelihood || 0) > 0).length
    if (summary.percent_ai_repo == null)
      summary.percent_ai_repo = summary.files_scanned
        ? summary.ai_files / summary.files_scanned
        : 0
    const pct = Math.round((summary.percent_ai_repo || 0) * 100)
    summary.overview = summary.files_scanned
      ? `Detected ${summary.ai_files} AI-flagged files out of ${summary.files_scanned} scanned (${pct}%).`
      : 'No files analyzed.'
    if (!Array.isArray(summary.notes)) summary.notes = summary.notes ? [summary.notes] : []
    parsed.repo_summary = summary
    return parsed
  } catch {
    return {
      repo_summary: {
        percent_ai_repo: 0,
        files_scanned: 0,
        ai_files: 0,
        overview: 'No files analyzed.',
        notes: ['parse_error']
      },
      files: [],
      commits: []
    }
  }
}

export async function detectAiArtifacts(
  files: any[],
  commits: any[]
): Promise<any> {
  const allFiles = Array.isArray(files) ? files : []
  const commitList = Array.isArray(commits) ? commits : []

  const preFlagged: any[] = []
  const remaining: any[] = []
  for (const f of allFiles) {
    const marker = scanMarkers(f.content || '')
    if (marker) {
      preFlagged.push({
        path: f.path,
        ai_likelihood: 1,
        percent_ai_lines: 1,
        impact: 'low',
        confidence: 0.6,
        top_signals: ['marker'],
        evidence: [marker]
      })
      continue
    }
    const heur = scanFileHeuristics(f.path, f.content || '')
    if (heur) {
      preFlagged.push(heur)
    } else {
      remaining.push(f)
    }
  }

  const preCommit: any[] = []
  const commitRemaining: any[] = []
  for (const c of commitList) {
    const heur = scanCommitLinguistics(c)
    if (heur) preCommit.push(heur)
    else commitRemaining.push(c)
  }

  const scanned: any[] = [...preFlagged]
  const notes: string[] = []
  let count = preFlagged.length
  let commitResult: any[] = [...preCommit]
  let idx = 0
  let commitScanned = false

  while (idx < remaining.length) {
    const batch = remaining.slice(idx, idx + 200)
    const res = await detectAiArtifactsBatch(batch, commitScanned ? [] : commitRemaining)
    commitScanned = true
    scanned.push(...(res.files || []))
    if (Array.isArray(res.commits)) {
      commitResult.push(...res.commits)
    }
    idx += res.repo_summary?.files_scanned || batch.length
    count += res.repo_summary?.files_scanned || batch.length
    if (Array.isArray(res.repo_summary?.notes)) {
      notes.push(...res.repo_summary.notes)
    }
  }

  let filtered = scanned.filter(f => (f.ai_likelihood || 0) >= 0.6)
  let aiFiles = filtered.length
  commitResult = commitResult.filter(c => (c.ai_likelihood || 0) >= 0.6)
  const percent = count ? aiFiles / count : 0
  const summary = {
    percent_ai_repo: percent,
    files_scanned: count,
    ai_files: aiFiles,
    notes: Array.from(new Set(notes)),
    overview: count
      ? aiFiles > 0
        ? `Detected ${aiFiles} AI-flagged files out of ${count} scanned (${Math.round(percent * 100)}%).`
        : 'No AI-generated code indicators found.'
      : 'No files analyzed.'
  }

  return { repo_summary: summary, files: filtered, commits: commitResult }
}


