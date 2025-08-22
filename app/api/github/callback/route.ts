import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const error = req.nextUrl.searchParams.get('error')
  if (error) {
    return NextResponse.redirect(new URL(`/?error=${error}`, req.url))
  }
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/?error=code', req.url))
  }
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/?error=config', req.url))
  }
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code
    })
  })
  const data = await tokenRes.json()
  if (!tokenRes.ok || !data.access_token) {
    return NextResponse.redirect(new URL('/?error=oauth', req.url))
  }
  const res = NextResponse.redirect(new URL('/', req.url))
  res.cookies.set('github_token', data.access_token, { httpOnly: true, secure: true, path: '/' })
  return res
}
