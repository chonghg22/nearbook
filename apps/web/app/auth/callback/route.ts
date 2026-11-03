import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { safeReturnPath } from '@/lib/auth-return-path'
import { openKakaoSession } from '@/lib/auth/api'
import {
  LEGACY_COOKIE,
  OAUTH_STATE_COOKIE,
  writeSessionCookies,
} from '@/lib/auth/session-cookies'
import { publicOrigin } from '@/lib/auth/origin'

function readState(raw: string | undefined): { state: string; next: string } | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as { state?: unknown; next?: unknown }
    if (typeof value.state !== 'string' || value.state.length < 16) return null
    return { state: value.state, next: safeReturnPath(typeof value.next === 'string' ? value.next : null) }
  } catch {
    return null
  }
}

function sameState(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = publicOrigin(request)
  const secure = origin.startsWith('https:')
  const store = await cookies()
  const expected = readState(store.get(OAUTH_STATE_COOKIE)?.value)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const fail = () => {
    const retry = expected && expected.next !== '/' ? `&next=${encodeURIComponent(expected.next)}` : ''
    const response = NextResponse.redirect(`${origin}/login?error=auth${retry}`)
    response.cookies.set(OAUTH_STATE_COOKIE, '', { path: '/auth', maxAge: 0 })
    return response
  }

  if (!code || code.length > 512 || !state || !expected || !sameState(state, expected.state)) return fail()

  const result = await openKakaoSession(code, `${origin}/auth/callback`, request.headers.get('user-agent'))
  if (result.status !== 'ok') return fail()

  const response = NextResponse.redirect(`${origin}${expected.next}`)
  response.headers.set('Cache-Control', 'no-store')
  response.cookies.set(OAUTH_STATE_COOKIE, '', { path: '/auth', maxAge: 0 })
  writeSessionCookies(response.cookies, result.session, secure)
  for (const legacy of store.getAll().filter((c) => LEGACY_COOKIE.test(c.name)))
    response.cookies.set(legacy.name, '', { path: '/', maxAge: 0 })
  return response
}
