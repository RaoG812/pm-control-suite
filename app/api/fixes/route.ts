// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { suggestFixes } from '../../../lib/openai'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const analysis = body.analysis
  if (!analysis) {
    return NextResponse.json({ error: 'analysis required' }, { status: 400 })
  }
  try {
    const suggestion = await suggestFixes(analysis)
    return NextResponse.json({ suggestion })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to suggest fixes'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
