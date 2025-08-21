// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import AdmZip from 'adm-zip'
import { summarizeRepo } from '../../../lib/openai'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const repo = form.get('repo')
  const branch = form.get('branch') || 'main'
  const temp = parseInt((form.get('temp') as string) || '0')
  let buffer: Buffer

  if (typeof repo === 'string' && repo) {
    const url = `https://codeload.github.com/${repo}/zip/${branch}`
    const res = await fetch(url)
    if (!res.ok) {
      return NextResponse.json({ error: 'failed to fetch repo' }, { status: 500 })
    }
    buffer = Buffer.from(await res.arrayBuffer())
  } else {
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file field required' }, { status: 400 })
    }
    buffer = Buffer.from(await file.arrayBuffer())
  }
  const zip = new AdmZip(buffer)
  const allEntries = zip.getEntries()
  const fileObjs = allEntries
    .filter(e => !e.isDirectory)
    .map(e => ({
      path: e.entryName,
      content: e.getData().toString('utf8').slice(0, 2000)
    }))
  const files = fileObjs.map(f => f.path)
  let packages: string[] = []
  const pkgEntry = allEntries.find(e => /package\.json$/.test(e.entryName))
  if (pkgEntry) {
    try {
      const pkg = JSON.parse(pkgEntry.getData().toString('utf8'))
      packages = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) })
    } catch {}
  }

  try {
    const analysis = await summarizeRepo(fileObjs, temp)
    return NextResponse.json({ files, packages, analysis })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'analysis failed'
    console.error('analysis failed', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
