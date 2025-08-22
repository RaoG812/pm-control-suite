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

export async function summarizeRepo(fileList: string[]): Promise<RepoAnalysis> {
  // Large repositories can exceed token limits; only send the first 200 entries
  const content = fileList.slice(0, 200).join('\n')
  const messages: any = [
    {
      role: 'system',
      content:
        'Summarize the repository file list. Respond with JSON of shape {"overview":string,"takeaways":string[],"metrics":{"complexity":number,"documentation":number,"tests":number}}. Values are 0-100. No extra text.'
    },
    { role: 'user', content }
  ]

  const txt = await chat(messages, { type: 'json_object' })
  return JSON.parse(txt)
}

export async function roastRepo(
  fileList: string[],
  docs: { name: string; content: string }[] = [],
  level = 0.5
): Promise<RoastComment[]> {
  const fileContent = fileList.slice(0, 200).join('\n')
  const docContent = docs
    .slice(0, 5)
    .map(d => `### ${d.name}\n${d.content.slice(0, 1000)}`)
    .join('\n\n')
  const content = docContent ? `${fileContent}\n\n${docContent}` : fileContent
  const messages: any = [
    {
      role: 'system',
      content: `Provide a concise project review from frontend, backend and ops departments at criticism level ${level} (0=gently, 1=brutal). Consider the repository file list and accompanying documentation. Respond with JSON {\"reviews\":[{\"department\":string,\"comment\":string,\"temperature\":number}]}. Temperature is between 0 and 1 indicating criticism level.`
    },
    { role: 'user', content }
  ]
  const txt = await chat(messages, { type: 'json_object' })
  try {
    const parsed = JSON.parse(txt)
    return Array.isArray(parsed.reviews) ? parsed.reviews : []
  } catch {
    return []
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

  const txt = await chat(messages, { type: 'json_object' })
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

