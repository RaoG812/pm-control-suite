import { NextResponse } from 'next/server'
import { oint } from '../state'

export async function GET() {
  return NextResponse.json({ state: oint.state, jobId: oint.jobId })
}
