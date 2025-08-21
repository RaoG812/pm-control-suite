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

// Create a client that can talk to AIMLAPI when AIML_API_KEY is provided.
// Otherwise, it falls back to the standard OpenAI endpoint using OPENAI_API_KEY.
const apiKey = process.env.AIML_API_KEY || process.env.OPENAI_API_KEY
const baseURL = process.env.AIML_API_KEY
  ? process.env.AIML_API_BASE_URL || 'https://api.aimlapi.com/v1'
  : process.env.OPENAI_BASE_URL

const client = new OpenAI({ apiKey, baseURL })

async function chat(messages: any[], response_format: any) {
  if (!apiKey) throw new Error('LLM API key missing')
  const primary = process.env.LLM_MODEL || 'gpt-5'
  const models = [primary, 'gpt-4o'].filter((v, i, a) => a.indexOf(v) === i)
  let lastErr: any
  for (const m of models) {
    try {
      const res = await client.chat.completions.create({
        model: m,
        messages,
        reasoning: m.startsWith('gpt-5') ? ({ effort: 'medium' } as any) : undefined,
        response_format
      } as any)
      return res.choices[0]?.message?.content ?? '{}'
    } catch (err) {
      lastErr = err
    }
  }
  const status = lastErr?.status || lastErr?.response?.status
  const body = lastErr?.response?.data
  const detail = status ? `${status}${body ? ` ${JSON.stringify(body)}` : ''}` : lastErr?.message
  console.error('LLM analysis failed', lastErr)
  throw new Error(`LLM analysis failed: ${detail}`)
}

export async function summarizeRepo(
  files: { path: string; content: string }[],
  level = 0
): Promise<RepoAnalysis> {
  const tones = [
    'Provide a gentle, high-level review highlighting strengths and mild suggestions for improvement across backend, frontend, database and other areas.',
    'Deliver a direct and balanced code audit noting weaknesses, missing pieces and potential risks for backend, frontend, database and other components.',
    'Produce an unforgiving, highly critical audit that focuses on vulnerabilities, missing tests and documentation, and any red flags in backend, frontend, database and other parts. No praise, only issues.'
  ]
  const sys = tones[level] || tones[0]

  const overallContent = files
    .slice(0, 20)
    .map(f => `FILE: ${f.path}\n${f.content}`)
    .join('\n\n')
  const overall = await chat(
    [
      {
        role: 'system',
        content:
          `${sys} Respond with JSON of shape {"overview":string,"metrics":{"complexity":number,"documentation":number,"tests":number}}. Values are 0-100. No extra text.`
      },
      { role: 'user', content: overallContent }
    ],
    { type: 'json_object' }
  )
  const parsed = JSON.parse(overall)

  function domain(path: string) {
    if (/db|sql|prisma|schema/i.test(path)) return 'DB'
    if (/frontend|components|\.tsx|\.jsx/i.test(path)) return 'Frontend'
    if (/api|server|backend|\.ts$|\.js$/.test(path) && !/\.tsx|\.jsx/.test(path)) return 'Backend'
    return 'Other'
  }

  const domains = ['Backend', 'Frontend', 'DB', 'Other']
  const takeaways: string[] = []
  for (const d of domains) {
    const subset = files.filter(f => domain(f.path) === d).slice(0, 5)
    const prompt = subset.length
      ? subset.map(f => `FILE: ${f.path}\n${f.content}`).join('\n\n')
      : 'No relevant files.'
    const txt = await chat(
      [
        {
          role: 'system',
          content: `Identify critical problems and missing pieces in the ${d} code.`
        },
        { role: 'user', content: prompt }
      ],
      { type: 'text' }
    )
    takeaways.push(txt.trim())
  }

  return { overview: parsed.overview || '', metrics: parsed.metrics || { complexity: 0, documentation: 0, tests: 0 }, takeaways }
}

export async function explainPackage(pkg: string): Promise<string> {
  const res = await client.chat.completions.create({
    model: 'gpt-4.1-nano',
    messages: [
      {
        role: 'system',
        content:
          'In one concise sentence, explain what this npm package provides and how it typically integrates into a JS/TS project.'
      },
      { role: 'user', content: pkg }
    ]
  } as any)
  return res.choices[0]?.message?.content?.trim() || ''
}

export async function suggestFixes(analysis: RepoAnalysis): Promise<string> {
  const messages = [
    {
      role: 'system',
      content:
        'Given repository health metrics and critique, propose one concise fix or improvement action for maintainers. Plain text only.'
    },
    { role: 'user', content: JSON.stringify(analysis) }
  ]
  const res = await client.chat.completions.create({
    model: 'gpt-4.1-nano',
    messages
  } as any)
  return res.choices[0]?.message?.content?.trim() || ''
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
    { type: 'json_object' }
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
    { type: 'json_object' }
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

