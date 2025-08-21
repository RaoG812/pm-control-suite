'use client'
import Image from 'next/image'
import { IntegrationRow } from '../lib/types.mission'
import { scoreColor } from '../lib/ui'

export default function IntegrationMatrix({ rows, category, evidenceOnly }: { rows: IntegrationRow[]; category?: IntegrationRow['category']; evidenceOnly?: boolean }) {
  let data = rows
  if (category) data = data.filter(r => r.category === category)
  if (evidenceOnly) data = data.filter(r => r.evidence && r.evidence.length > 0)
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-2">Integration</th>
            <th className="p-2">Impact</th>
            <th className="p-2">Security</th>
            <th className="p-2">Ops</th>
            <th className="p-2">Health</th>
            <th className="p-2">Coupling</th>
            <th className="p-2">Upgrade</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.name} className="border-t border-zinc-800">
              <td className="p-2 flex items-center gap-2">
                {row.logoUrl && (
                  <Image src={row.logoUrl} alt="logo" width={20} height={20} className="rounded" />
                )}
                {row.name}
              </td>
              <td className={`p-2 ${scoreColor(row.impact)}`}>{row.impact}</td>
              <td className={`p-2 ${scoreColor(row.security)}`}>{row.security}</td>
              <td className={`p-2 ${scoreColor(row.ops)}`}>{row.ops}</td>
              <td className={`p-2 ${scoreColor(row.health)}`}>{row.health}</td>
              <td className={`p-2 ${scoreColor(100 - row.coupling)}`}>{row.coupling}</td>
              <td className={`p-2 ${scoreColor(row.upgrade)}`}>{row.upgrade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
