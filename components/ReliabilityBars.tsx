'use client'
import { Reliability } from '../lib/types.mission'
import { Progress } from '../lib/ui'

export default function ReliabilityBars({ reliability }: { reliability: Reliability }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm"><span>Test Coverage</span><span>{reliability.coveragePct}%</span></div>
        <Progress value={reliability.coveragePct} />
      </div>
      <div>
        <div className="flex justify-between text-sm"><span>Evidence Completeness</span><span>{reliability.evidenceCompletenessPct}%</span></div>
        <Progress value={reliability.evidenceCompletenessPct} />
      </div>
      <div>
        <div className="flex justify-between text-sm"><span>LLM Static Agreement</span><span>{reliability.llmStaticAgreementPct}%</span></div>
        <Progress value={reliability.llmStaticAgreementPct} />
      </div>
    </div>
  )
}
