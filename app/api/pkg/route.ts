// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { explainPackage } from '../../../lib/openai'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')
  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }
  try {
    const info = await explainPackage(name)
    return NextResponse.json({ info })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to explain package'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
