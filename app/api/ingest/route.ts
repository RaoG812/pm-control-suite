// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import AdmZip from 'adm-zip'
import { summarizeRepo } from '../../../lib/openai'
import { githubHeaders } from '../../../lib/github'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!req.headers.get('content-type')?.includes('multipart/form-data')) {
    return NextResponse.json(
      { error: 'multipart/form-data required' },
      { status: 400 }
    )
  }
  try {
    const form = await req.formData()
    const repo = form.get('repo')
    let branch = form.get('branch')?.toString() || ''
    if (!branch && typeof repo === 'string' && repo) {
      try {
        const infoRes = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: githubHeaders(req)
        })
        if (infoRes.ok) {
          const info = await infoRes.json()
          branch = info.default_branch || 'main'
        }
      } catch {
        branch = 'main'
      }
    }
    if (!branch) branch = 'main'
    const docsMetaRaw = form.get('docs_meta')
    let docsMeta: any[] = []
    if (typeof docsMetaRaw === 'string') {
      try {
        const parsed = JSON.parse(docsMetaRaw)
        if (Array.isArray(parsed)) docsMeta = parsed
      } catch {}
    }
    const docFiles = (typeof File !== 'undefined'
      ? form.getAll('docs').filter(f => f instanceof File)
      : []) as File[]
    const docs = [] as { name: string; type: string; content: string }[]
    for (let i = 0; i < docFiles.length; i++) {
      const file = docFiles[i]
      const meta = docsMeta[i] || {}
      const text = await file.text()
      docs.push({
        name: meta.name || file.name,
        type: meta.type || 'other',
        content: text.slice(0, 10000)
      })
    }
    let buffer: Buffer

    if (typeof repo === 'string' && repo) {
      const url = `https://codeload.github.com/${repo}/zip/${branch}`
      const res = await fetch(url, { headers: githubHeaders(req) })
      if (!res.ok) {
        return NextResponse.json(
          { error: 'failed to fetch repo' },
          { status: 500 }
        )
      }
      buffer = Buffer.from(await res.arrayBuffer())
    } else {
      const file = form.get('file')
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: 'file field required' },
          { status: 400 }
        )
      }
      buffer = Buffer.from(await file.arrayBuffer())
    }
    const zip = new AdmZip(buffer)
    const allEntries = zip.getEntries()
    const fileEntries = allEntries.filter(e => !e.isDirectory)
    const prefix =
      typeof repo === 'string' && repo
        ? `${repo.split('/')[1]}-${branch}/`
        : ''
    const files = fileEntries.map(e => e.entryName.replace(prefix, ''))
    const code = fileEntries.map(e => ({
      path: e.entryName.replace(prefix, ''),
      language: (e.entryName.split('.').pop() || '').toLowerCase(),
      content: e.getData().toString('utf8').slice(0, 10000)
    }))

    const analysis = await summarizeRepo(files, docs)
    return NextResponse.json({
      repo,
      branch,
      files,
      code,
      docs,
      analysis
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'analysis failed'
    console.error('analysis failed', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
