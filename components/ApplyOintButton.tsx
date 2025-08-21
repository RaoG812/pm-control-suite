'use client'
import { useEffect, useState } from 'react'
import { Check, RefreshCw, Loader2 } from 'lucide-react'
import { Button, Badge } from '../lib/ui'
import { applyOint, getStatus, waitForSuccess, OintState } from '../lib/ointClient'

export default function ApplyOintButton({ compact = false, onSuccess }: { compact?: boolean; onSuccess?: () => void }) {
  const [state, setState] = useState<OintState>('idle')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = window.localStorage.getItem('OINT_STATE') as OintState | null
      if (cached) setState(cached)
    }
    getStatus().then(s => setState(s.state))
  }, [])

  async function handleClick() {
    setToast(null)
    await applyOint()
    setState('running')
    const res = await waitForSuccess()
    setState(res)
    if (res === 'success') {
      setToast('OINT applied')
      onSuccess?.()
    } else {
      setToast('OINT failed')
    }
    setTimeout(() => setToast(null), 4000)
  }

  let label = 'Apply OINT'
  let variant: any = 'primary'
  let icon = null
  if (state === 'running') {
    label = 'Applying…'
    variant = 'secondary'
    icon = <Loader2 className="h-4 w-4 animate-spin" />
  } else if (state === 'success') {
    label = 'Reapply'
    variant = 'tertiary'
    icon = <Check className="h-4 w-4" />
  } else if (state === 'failed') {
    label = 'Retry Apply'
    variant = 'danger'
    icon = <RefreshCw className="h-4 w-4" />
  }

  return (
    <div className="flex flex-col items-start gap-2" aria-live="polite">
      <Button onClick={handleClick} disabled={state === 'running'} variant={variant} className={compact ? 'px-3 py-1' : ''}>
        {icon}
        <span>{label}</span>
      </Button>
      {toast && <Badge variant={state === 'failed' ? 'danger' : 'success'}>{toast}</Badge>}
    </div>
  )
}
