'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import ApplyOintButton from '../components/ApplyOintButton'
import { getStatus } from '../lib/ointClient'
import { Badge } from '../lib/ui'

export default function Home() {
  const [state, setState] = useState<'idle' | 'running' | 'success' | 'failed'>('idle')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = window.localStorage.getItem('OINT_STATE') as any
      if (cached) setState(cached)
    }
    getStatus().then(s => setState(s.state))
  }, [])
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Welcome to OINT</h1>
      <p className="text-zinc-400">Onboarding helper for new projects.</p>
      <div className="flex items-center gap-4">
        <ApplyOintButton />
        <Link href="/toolset" className="text-blue-400 underline">
          Go to Toolset
        </Link>
        {state === 'success' && <Badge variant="success">OINT ready</Badge>}
      </div>
    </main>
  )
}
