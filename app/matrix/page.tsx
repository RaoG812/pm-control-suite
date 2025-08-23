// @ts-nocheck
'use client'
import * as React from 'react'
import { useEffect, useMemo, useState, useRef } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { ArrowUpDown, Search, ShieldAlert, Cpu } from 'lucide-react'
import HexBackground from '../../components/HexBackground'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)
const Radar = dynamic(() => import('react-chartjs-2').then(m => m.Radar), { ssr: false })

// Minimal shadcn pieces (replace with imported components in real app)
function Card({children}:{children:React.ReactNode}){return <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-xl p-4 backdrop-blur-sm">{children}</div>}
function Pill({children}:{children:React.ReactNode}){return <span className="px-3 py-1 rounded-full text-xs bg-zinc-800/80 border border-zinc-700/80">{children}</span>}
function ExpandableCard({title,summary,children}:{title:string;summary:React.ReactNode;children:React.ReactNode}){
  const [open,setOpen] = useState(false)
  return (
    <Card>
      <div className="flex items-center justify-between cursor-pointer" onClick={()=>setOpen(o=>!o)}>
        <div className="text-sm font-semibold">{title}</div>
        <span className="text-xs text-zinc-400">{open? 'Hide':'Show'}</span>
      </div>
      <div className="text-xs text-zinc-400 mt-1">{summary}</div>
      {open && <div className="mt-2 text-xs text-zinc-400 space-y-1">{children}</div>}
    </Card>
  )
}

export type Row = {
  logoUrl?: string
  name: string
  category: string
  impact: number
  security: number
  ops: number
  health: number
  coupling: number
  upgrade: number
}

function scoreColor(v:number){
  if(v>=80) return 'text-emerald-400'
  if(v>=60) return 'text-amber-300'
  return 'text-rose-400'
}

const INDICATORS: Record<keyof Omit<Row,'logoUrl'|'name'|'category'>, { label: string; desc: string; improve: string }> = {
  impact: {
    label: 'Impact',
    desc: 'Criticality of the integration to core functionality.',
    improve: 'Increase alignment with product goals and add tests.'
  },
  security: {
    label: 'Security',
    desc: 'Exposure to vulnerabilities or insecure configs.',
    improve: 'Audit dependencies and apply security updates.'
  },
  ops: {
    label: 'Ops',
    desc: 'Operational overhead and runtime complexity.',
    improve: 'Automate setup and streamline deployment.'
  },
  health: {
    label: 'Health',
    desc: 'Community activity and maintenance cadence.',
    improve: 'Monitor releases and keep versions current.'
  },
  coupling: {
    label: 'Coupling',
    desc: 'How tightly the code depends on this integration.',
    improve: 'Isolate boundaries and reduce cross-module imports.'
  },
  upgrade: {
    label: 'Upgrade',
    desc: 'Difficulty of moving to the latest version.',
    improve: 'Pin versions and follow changelogs to plan upgrades.'
  }
}

export default function MatrixPage(){
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [repo, setRepo] = useState('')
  const [branches, setBranches] = useState<string[]>([])
  const [branch, setBranch] = useState('main')
  const [loading, setLoading] = useState(true)
  const firstLoad = useRef(true)

  useEffect(() => {
    if (branch) localStorage.setItem('branch', branch)
  }, [branch])

  useEffect(() => {
    const r = localStorage.getItem('repo') || ''
    const b = localStorage.getItem('branch') || 'main'
    setRepo(r)
    setBranch(b)
  }, [])

  useEffect(() => {
    if (!repo) return
    fetch(`/api/github/branches?repo=${repo}`)
      .then(r => r.json())
      .then(d => Array.isArray(d) && setBranches(d.map((x: any) => x.name)))
      .catch(() => setBranches([]))
  }, [repo])

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'repo') setRepo(localStorage.getItem('repo') || '')
      if (e.key === 'branch') setBranch(localStorage.getItem('branch') || 'main')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(()=>{
    let active = true
    async function load(){
      if(firstLoad.current) setLoading(true)
      if(!repo){
        const ingest = localStorage.getItem('ingestResult')
        if(!ingest){ if(active){ setRows([]); if(firstLoad.current){setLoading(false); firstLoad.current=false;} } return }
        let deps: string[] = []
        try{
          const parsed = JSON.parse(ingest)
          const pkg = parsed.code?.find((c: any) => c.path.endsWith('package.json'))
          if(pkg){
            const obj = JSON.parse(pkg.content)
            deps = Object.keys(obj.dependencies || {})
          }
        }catch{}
        if(deps.length===0){ if(active){ setRows([]); if(firstLoad.current){setLoading(false); firstLoad.current=false;} } return }
        try{
          const url = `/api/components?deps=${encodeURIComponent(deps.join(','))}`
          const data = await fetch(url).then(r=>r.json())
          if(active){ setRows(data); if(firstLoad.current){setLoading(false); firstLoad.current=false;} }
        }catch{
          if(active){ setRows([]); if(firstLoad.current){setLoading(false); firstLoad.current=false;} }
        }
        return
      }
      try{
        const data = await fetch(`/api/components?repo=${encodeURIComponent(repo)}&branch=${branch}`).then(r=>r.json())
        if(active){ setRows(data); if(firstLoad.current){setLoading(false); firstLoad.current=false;} }
      }catch{
        if(active){ setRows([]); if(firstLoad.current){setLoading(false); firstLoad.current=false;} }
      }
    }
    load()
    const id = setInterval(load,5000)
    return ()=>{active=false; clearInterval(id)}
  },[repo,branch])

  useEffect(() => {
    setRows([])
    firstLoad.current = true
    setLoading(true)
  }, [repo, branch])
  const filtered = useMemo(()=>rows.filter(r=>
    r.name.includes(query) || r.category.toLowerCase().includes(query.toLowerCase())
  ),[rows,query])
  const [sortKey, setSortKey] = useState<keyof Row>('impact')
  const [asc, setAsc] = useState(false)
  const sorted = useMemo(()=>[...filtered].sort((a,b)=>{
    const d = (a[sortKey] as number)-(b[sortKey] as number)
    return asc? d : -d
  }),[filtered,sortKey,asc])
  const readiness = useMemo(()=>{
    const totals = rows.map(r => (r.impact + r.security + r.ops + r.health + r.coupling + r.upgrade) / 6)
    return totals.reduce((a,b)=>a+b,0) / (totals.length || 1)
  },[rows])
  const weeksRemaining = Math.round(12 * (1 - readiness/100))
  const [selected, setSelected] = useState<{row: Row; code: any[]}|null>(null)

  async function showDetails(r: Row){
    if(!repo){
      const ingest = localStorage.getItem('ingestResult')
      const code: { file: string; line: number; code: string }[] = []
      if(ingest){
        try{
          const parsed = JSON.parse(ingest)
          const raw = r.name
          const base = raw.split(/[\\/@]/).pop() || raw
          const short = base.split('-')[0]
          const needles = Array.from(new Set([raw, base, short])).filter(Boolean)
          const pattern = new RegExp(needles.map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'))
          parsed.code?.forEach((c: any) => {
            const lines = c.content.split(/\r?\n/)
            lines.forEach((line: string, idx: number) => {
              if(pattern.test(line)){
                code.push({ file: c.path, line: idx+1, code: line.trim() })
              }
            })
          })
        }catch{}
      }
      setSelected({ row: r, code: code.slice(0,20) })
      return
    }
    const code = await fetch(`/api/code/${encodeURIComponent(r.name)}?repo=${encodeURIComponent(repo)}&branch=${branch}`).then(res=>res.json()).catch(()=>[])
    setSelected({ row: r, code })
  }

  const categoryCounts = useMemo(()=>{
    const map: Record<string, number> = {}
    rows.forEach(r=>{ map[r.category]=(map[r.category]||0)+1 })
    return map
  },[rows])
  const riskyAll = useMemo(()=>rows.filter(r=>r.security<60).sort((a,b)=>a.security-b.security),[rows])
  const risky = useMemo(()=>riskyAll.slice(0,2),[riskyAll])
  const radarData = useMemo(
    () => ({
      labels: Object.keys(categoryCounts),
      datasets: [
        {
          label: 'Categories',
          data: Object.values(categoryCounts),
          backgroundColor: 'rgba(16,185,129,0.3)',
          borderColor: '#10b981',
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#10b981',
          fill: true
        }
      ]
    }),
    [categoryCounts]
  )

  return (
    <div className="relative min-h-screen text-zinc-200">
      <HexBackground />
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(at 25% 25%, rgba(236,72,153,0.4), transparent 60%), radial-gradient(at 75% 25%, rgba(109,40,217,0.4), transparent 60%), radial-gradient(at 50% 75%, rgba(255,255,255,0.2), transparent 70%)',
            backgroundSize: '200% 200%',
            animation: 'bgMove 20s ease infinite',
            filter: 'blur(40px)'
          }}
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10 space-y-6 fade-in-fast">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Integration Matrix</h1>
            <p className="text-sm text-zinc-400">Evidence-backed snapshot of repo integrations</p>
          </div>
        <div className="flex items-center gap-2">
            {repo && (
              <select value={branch} onChange={e=>setBranch(e.target.value)} className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm">
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
            <div className="relative">
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search integrations…" className="pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"/>
              <Search className="w-4 h-4 absolute left-2 top-2.5 text-zinc-500"/>
            </div>
          </div>
        </div>

        <Card>
          <div className="grid grid-cols-[auto_1fr_repeat(6,96px)] items-center gap-3 text-xs font-medium text-zinc-400 pb-2 border-b border-zinc-800">
            <div className="pl-2">Integration</div>
            <div>Category</div>
            {['Impact','Security','Ops','Health','Coupling','Upgrade'].map(k=>
              <button key={k} onClick={()=>{setSortKey(k.toLowerCase() as keyof Row); setAsc(s=>!s)}} className="flex items-center gap-1 hover:text-zinc-200 transition">
                <ArrowUpDown className="w-3 h-3"/>{k}
              </button>
            )}
          </div>
          <div className="divide-y divide-zinc-900/60 min-h-[80px]">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-500" />
              </div>
            ) : (
              sorted.map(r => (
                <button
                  type="button"
                  key={r.name}
                  onClick={() => showDetails(r)}
                  className="grid w-full grid-cols-[auto_1fr_repeat(6,96px)] items-center gap-3 py-3 hover:bg-zinc-900/40 rounded-xl text-left cursor-pointer"
                >
                  <div className="pl-2 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">
                      {r.logoUrl ? (
                        <Image src={r.logoUrl} alt={r.name} width={18} height={18} />
                      ) : (
                        <Cpu className="w-4 h-4 text-zinc-500" />
                      )}
                    </div>
                    <div className="text-sm text-zinc-200">{r.name}</div>
                  </div>
                  <div className="text-xs text-zinc-400"><Pill>{r.category}</Pill></div>
                  {[r.impact, r.security, r.ops, r.health, r.coupling, r.upgrade].map((v, i) => (
                    <div key={i} className={`text-sm font-semibold tabular-nums ${scoreColor(v)} text-center`}>
                      {v}
                    </div>
                  ))}
                </button>
              ))
            )}
          </div>
        </Card>

        <div className="grid md:grid-cols-4 gap-4">
          <ExpandableCard title="Risk Highlights" summary={<span className="flex items-center gap-2"><ShieldAlert className="w-4 h-4"/>{riskyAll.length} pending actions</span>}>
            {loading ? (
              <div className="flex justify-center py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-500" />
              </div>
            ) : risky.length>0 ? risky.map(r=>(<div key={r.name}>• {r.name} – security {r.security}</div>)) : <div>No major risks</div>}
          </ExpandableCard>
          <ExpandableCard title="Coverage" summary={`${rows.length} integrations • ${Object.keys(categoryCounts).length} categories`}>
            {loading ? (
              <div className="flex justify-center py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-500" />
              </div>
            ) : (
              <>
                <div>• {rows.length} integrations loaded</div>
                <div>• {Object.keys(categoryCounts).length} categories</div>
              </>
            )}
          </ExpandableCard>
          <ExpandableCard title="Timeline" summary={`${weeksRemaining} weeks remaining`}>
            {loading ? (
              <div className="flex justify-center py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-500" />
              </div>
            ) : (
              <>
                <div className="relative w-full h-2 bg-zinc-800 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${readiness}%` }}
                  />
                  <div
                    className="absolute top-0 -translate-x-1/2"
                    style={{ left: `${readiness}%` }}
                  >
                    <div className="w-px h-2 bg-emerald-400" />
                    <div className="text-[10px] text-emerald-400 mt-1 animate-pulse">WE ARE HERE</div>
                  </div>
                </div>
                <div className="mt-1 text-[10px] text-right text-zinc-500">
                  Readiness {readiness.toFixed(0)}%
                </div>
                <div className="mt-1 text-[10px] text-zinc-400">
                  Estimate based on average integration readiness across the project
                </div>
              </>
            )}
          </ExpandableCard>
          <Card>
            <div className="text-sm font-semibold mb-2">Category Radar</div>
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-500" />
              </div>
            ) : Object.keys(categoryCounts).length > 0 ? (
              <Radar
                data={radarData}
                options={{
                  plugins: { legend: { display: false } },
                  scales: {
                    r: {
                      beginAtZero: true,
                      angleLines: { color: '#27272a' },
                      grid: { color: '#27272a' },
                      ticks: { display: false }
                    }
                  }
                }}
              />
            ) : (
              <div className="text-xs text-zinc-400">No data</div>
            )}
          </Card>
        </div>

        {selected && (
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-2">{selected.row.name}</h2>
                <div className="grid md:grid-cols-2 gap-4 text-xs text-zinc-400">
                  {(Object.keys(INDICATORS) as Array<keyof typeof INDICATORS>).map(key => {
                    const info = INDICATORS[key]
                    const value = selected.row[key as keyof Row] as number
                    return (
                      <div key={key}>
                        <div className="font-medium text-zinc-200 mb-1">{info.label}: <span className={`ml-1 ${scoreColor(value)} font-semibold`}>{value}</span></div>
                        <div>{info.desc}</div>
                        {value < 100 && <div className="text-emerald-400 mt-1">{info.improve}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
              <button className="text-zinc-500 hover:text-zinc-300" onClick={()=>setSelected(null)}>×</button>
            </div>
            <div className="mt-4">
              <div className="text-sm font-semibold mb-2">Code References</div>
              <pre className="text-xs bg-zinc-900 p-3 rounded-lg max-h-60 overflow-auto">
                {selected.code.map((c,i)=>`${c.file}:${c.line} ${c.code}`).join('\n') || 'No references found'}
              </pre>
            </div>
          </Card>
        )}
      </div>
      <style jsx>{`
        @keyframes bgMove {
          0% { background-position: 0 0; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0 0; }
        }
      `}</style>
    </div>
  )
}
