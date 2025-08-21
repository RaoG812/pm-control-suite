'use client'
import React from 'react'

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-zinc-700 bg-zinc-900 p-4', className)} {...props} />
}

export function Pill({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('px-3 py-1 rounded-full bg-zinc-800 text-sm', className)} {...props} />
}

export function Badge({ variant = 'default', className, ...props }: { variant?: 'default' | 'success' | 'danger'; className?: string } & React.HTMLAttributes<HTMLSpanElement>) {
  const colors = {
    default: 'bg-zinc-700 text-white',
    success: 'bg-green-600 text-white',
    danger: 'bg-red-600 text-white'
  }
  return <span className={cn('px-2 py-0.5 text-xs rounded-full', colors[variant], className)} {...props} />
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: { variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none'
  const variants: Record<string, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-500',
    secondary: 'bg-zinc-700 text-white hover:bg-zinc-600',
    tertiary: 'bg-transparent text-blue-400 hover:bg-zinc-800 border border-zinc-700',
    danger: 'bg-red-600 text-white hover:bg-red-500'
  }
  return <button className={cn(base, variants[variant], className)} {...props} />
}

export function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="text-lg font-semibold text-white">{value}</span>
    </div>
  )
}

export function Modal({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <Card className="max-w-lg w-full">{children}</Card>
    </div>
  )
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="w-full h-2 rounded bg-zinc-800">
      <div className="h-2 rounded bg-blue-500" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  )
}

export function severityColor(sev: 'critical' | 'high' | 'medium' | 'low') {
  return {
    critical: 'text-red-500',
    high: 'text-orange-400',
    medium: 'text-yellow-400',
    low: 'text-green-400'
  }[sev]
}

export function scoreColor(score: number) {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  return 'text-red-400'
}
