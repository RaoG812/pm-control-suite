'use client'
import { useState } from 'react'

const LS_STATE = 'OINT_STATE'
const LS_JOB = 'OINT_JOB_ID'

export type OintState = 'idle' | 'running' | 'success' | 'failed'

export async function getStatus(): Promise<{ state: OintState; jobId?: string }> {
  const res = await fetch('/api/oint/status', { cache: 'no-store' })
  const data = await res.json()
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LS_STATE, data.state)
    if (data.jobId) window.localStorage.setItem(LS_JOB, data.jobId)
  }
  return data
}

export async function applyOint(): Promise<{ jobId: string }> {
  const res = await fetch('/api/oint/apply', { method: 'POST' })
  const data = await res.json()
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LS_STATE, 'running')
    window.localStorage.setItem(LS_JOB, data.jobId)
  }
  return data
}

export async function waitForSuccess(opts?: { timeoutMs?: number }): Promise<'success' | 'failed'> {
  const timeoutMs = opts?.timeoutMs ?? 60000
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 1500))
    const status = await getStatus()
    if (status.state === 'success' || status.state === 'failed') {
      return status.state
    }
  }
  return 'failed'
}

export function useCachedState(): OintState {
  const [state] = useState<OintState>(() => {
    if (typeof window === 'undefined') return 'idle'
    return (window.localStorage.getItem(LS_STATE) as OintState) || 'idle'
  })
  return state
}
