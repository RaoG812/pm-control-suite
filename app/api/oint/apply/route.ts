import { NextResponse } from 'next/server'
import { isCreated, getKnowledge } from '../state'
import { applyOint } from '../../../../lib/openai'

export async function POST(req: Request) {
  if (!isCreated()) {
    return NextResponse.json({ error: 'OINT not created' }, { status: 409 })
  }

  const body = await req.json().catch(() => ({}))
  const roast = Array.isArray(body.roast) ? body.roast : []

  let { docs, files, code } = getKnowledge()
  if (body.knowledge) {
    const k = body.knowledge
    if (Array.isArray(k.docs) && Array.isArray(k.files)) {
      docs = k.docs.map((d: any) => ({
        name: d.name,
        text: (d.text || d.content || '').toString()
      }))
      files = k.files
    }
    if (Array.isArray(k.code)) {
      code = k.code
        .filter((f: any) => f && typeof f.path === 'string')
        .map((f: any) => ({ path: f.path, content: String(f.content || '') }))
    }
  }
  try {
    const { comments, steps } = await applyOint(roast, files, docs, code)
    return NextResponse.json({ comments, steps })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'apply OINT failed' },
      { status: 500 }
    )
  }
}
