import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revokeSession } from '@/lib/auth/api'
import { LEGACY_COOKIE, REFRESH_COOKIE, clearSessionCookies, isSecureRequest } from '@/lib/auth/session-cookies'

export async function POST(request: Request) {
  const store = await cookies()
  const refreshToken = store.get(REFRESH_COOKIE)?.value
  if (refreshToken) await revokeSession(refreshToken)

  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  const legacy = store.getAll().map((c) => c.name).filter((name) => LEGACY_COOKIE.test(name))
  clearSessionCookies(response.cookies, isSecureRequest(request.url), legacy)
  return response
}
