'use client'
import Link from 'next/link'
import Image from 'next/image'
import HexBackground from '../components/HexBackground'

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <HexBackground />
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(at 25% 25%, rgba(30,58,138,0.4), transparent 60%), radial-gradient(at 75% 25%, rgba(46,16,101,0.4), transparent 60%), radial-gradient(at 50% 75%, rgba(255,255,255,0.2), transparent 70%)',
            backgroundSize: '200% 200%',
            animation: 'bgMove 20s ease infinite',
            filter: 'blur(40px)'
          }}
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>
      {/* Stretched background logo with iridescence positioned at right third */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-30">
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[1.5] h-full w-full iridescent-logo"
          style={{ left: '83.3%' }}
        />
      </div>
      <div className="relative z-10 p-6 max-w-3xl mx-auto space-y-6 fade-in-fast">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            <span className="text-emerald-400">OINT</span>ment
          </h1>
          <p className="text-sm text-zinc-400">Onboarding Insights Neural Toolset</p>
        </div>
        <div className="flex gap-4">
          <Link
            href="/ingest"
            className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition"
          >
            Ingest Project Data
          </Link>
          <Link
            href="/roaster"
            className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition"
          >
            Roast the Team
          </Link>
          <Link
            href="/toolset"
            className="group relative overflow-hidden rounded-lg px-5 py-2 text-sm font-medium text-white"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-500 transition-opacity group-hover:opacity-90" />
            <span className="absolute inset-0 rounded-lg ring-1 ring-white/10 group-hover:ring-emerald-400/50" />
            <span className="relative">OINT Mission Control</span>
          </Link>
        </div>
        <div className="pt-8 text-sm text-zinc-400 max-w-prose">
          <p>
            <span className="font-semibold text-emerald-400">OINT</span> stands for
            <em> Onboarding Insights Neural Toolset</em>. OINTment smooths project onboarding by exposing integrations,
            risks and recommended next steps.
          </p>
        </div>
        <div className="pt-4 grid grid-cols-2 gap-6 text-xs text-zinc-400 fade-in-fast">
          <div className="flex items-center gap-2">
            <Image src="https://logo.clearbit.com/openai.com" alt="OpenAI" width={24} height={24} className="rounded" />
            <span>LLM insights by OpenAI</span>
          </div>
          <div className="flex items-center gap-2">
            <Image src="https://logo.clearbit.com/aimlapi.com" alt="AI/ML API" width={24} height={24} className="rounded" />
            <span>Data APIs via aimlapi.com</span>
          </div>
          <div className="flex items-center gap-2">
            <Image src="https://logo.clearbit.com/vercel.com" alt="Vercel" width={24} height={24} className="rounded" />
            <span>Edge deploys on Vercel</span>
          </div>
          <div className="flex items-center gap-2">
            <Image src="https://logo.clearbit.com/github.com" alt="GitHub" width={24} height={24} className="rounded" />
            <span>Repo intel by GitHub</span>
          </div>
        </div>
      </div>
    </main>
  )
}
