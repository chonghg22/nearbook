import { NextResponse, type NextRequest } from 'next/server'
import { refreshSession } from '@/lib/auth/api'
import {
  ACCESS_COOKIE,
  LEGACY_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  isSecureRequest,
  writeSessionCookies,
  type IssuedSession,
} from '@/lib/auth/session-cookies'
import { verifyAccessToken } from '@/lib/auth/token'

/** Refresh the access token shortly before it expires so SSR and /auth-api/session see a valid one. */
const REFRESH_BEFORE_SECONDS = 60

export async function middleware(request: NextRequest) {
  const secure = isSecureRequest(request.url)
  const access = request.cookies.get(ACCESS_COOKIE)?.value
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value
  const legacy = request.cookies.getAll().map((c) => c.name).filter((name) => LEGACY_COOKIE.test(name))

  let issued: IssuedSession | null = null
  let clear = false
  const secret = process.env.AUTH_JWT_SECRET
  if (refresh && secret) {
    const fresh = await verifyAccessToken(access, secret, { minRemainingSeconds: REFRESH_BEFORE_SECONDS })
    if (!fresh) {
      const result = await refreshSession(refresh)
      if (result.status === 'ok') issued = result.session
      else if (result.status === 'rejected') clear = true
      // 'unavailable': keep cookies; the next request retries.
    }
  }

  // Propagate to this request so Server Components and route handlers read the updated cookies.
  if (issued) request.cookies.set(ACCESS_COOKIE, issued.accessToken)
  if (clear) {
    request.cookies.delete(ACCESS_COOKIE)
    request.cookies.delete(REFRESH_COOKIE)
  }
  for (const name of legacy) request.cookies.delete(name)

  const response = NextResponse.next({ request: { headers: request.headers } })
  if (issued) writeSessionCookies(response.cookies, issued, secure)
  if (clear) clearSessionCookies(response.cookies, secure)
  for (const name of legacy) response.cookies.set(name, '', { path: '/', maxAge: 0 })
  if (issued || clear) response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export const config = {
  matcher: [
    /*
     * 정적 자산·이미지·favicon, 공개 API 프록시 제외. 나머지 경로에서 세션 갱신
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
