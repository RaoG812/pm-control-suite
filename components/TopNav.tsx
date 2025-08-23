'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const links: { href: string; label: ReactNode; extra?: string; brand?: boolean }[] = [
  {
    href: '/',
    label: 'OINTment',
    extra: 'text-lg font-semibold tracking-tight group',
    brand: true
  },
  { href: '/ingest', label: 'Ingest' },
  { href: '/matrix', label: 'Matrix' },
  { href: '/roaster', label: 'Roaster' },
  { href: '/vibe-killer', label: 'Vibe Killer' },
  { href: '/toolset', label: 'Toolset' },
  { href: '/3d-map', label: '3D Map' }
]

export default function TopNav() {
  const pathname = usePathname()
  return (
    <nav className="mx-auto max-w-7xl flex items-center gap-6 px-6 py-4 text-sm overflow-x-auto whitespace-nowrap fade-in-fast">
      {links.map(l => {
        const active = pathname === l.href
        if (l.brand) {
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`${l.extra ?? ''} text-emerald-400`}
            >
              OINTment
            </Link>
          )
        }
        const base = 'hover:text-emerald-400'
        const cls = active ? 'text-emerald-400' : base
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`${cls} ${l.extra ?? ''}`}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
