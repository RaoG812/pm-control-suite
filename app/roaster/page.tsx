'use client'
import { useEffect, useState } from 'react'
import ApplyOintButton from '../../components/ApplyOintButton'
import { getStatus } from '../../lib/ointClient'

export default function Roaster() {
  const [state, setState] = useState<'idle' | 'running' | 'success' | 'failed'>('idle')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = window.localStorage.getItem('OINT_STATE') as any
      if (cached) setState(cached)
    }
    getStatus().then(s => setState(s.state))
  }, [])
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Roaster</h1>
      <ul className="list-disc pl-4 text-zinc-400">
        <li>Alice</li>
        <li>Bob</li>
        <li>Carol</li>
      </ul>
      <ApplyOintButton compact />
    </main>
  )
}
