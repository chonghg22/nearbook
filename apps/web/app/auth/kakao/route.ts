import { NextResponse } from 'next/server'
import { safeReturnPath } from '@/lib/auth-return-path'
import { OAUTH_STATE_COOKIE } from '@/lib/auth/session-cookies'
import { publicOrigin } from '@/lib/auth/origin'

const AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize'

function randomState() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Starts Kakao login. The state and return path are bound to this browser via an httpOnly cookie. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = publicOrigin(request)
  const clientId = process.env.KAKAO_REST_API_KEY?.trim()
  const next = safeReturnPath(searchParams.get('next'))
  if (!clientId) return NextResponse.redirect(`${origin}/login?error=auth&next=${encodeURIComponent(next)}`)

  const state = randomState()
  const authorize = new URL(AUTHORIZE_URL)
  authorize.searchParams.set('client_id', clientId)
  authorize.searchParams.set('redirect_uri', `${origin}/auth/callback`)
  authorize.searchParams.set('response_type', 'code')
  authorize.searchParams.set('scope', 'profile_nickname')
  authorize.searchParams.set('state', state)

  const response = NextResponse.redirect(authorize.toString())
  response.headers.set('Cache-Control', 'no-store')
  response.cookies.set(OAUTH_STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https:'),
    path: '/auth',
    maxAge: 600,
  })
  return response
}
