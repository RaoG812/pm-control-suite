import { NextResponse } from 'next/server'
import { startJob } from '../state'

export async function POST() {
  const jobId = startJob()
  return NextResponse.json({ jobId })
}
