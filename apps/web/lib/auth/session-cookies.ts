// Server/Edge-only cookie contract for Nearbook-issued sessions. Tokens are httpOnly; the browser
// receives the short-lived access token only through the same-origin /auth-api/session route.
export const ACCESS_COOKIE = 'nb_at'
export const REFRESH_COOKIE = 'nb_rt'
export const OAUTH_STATE_COOKIE = 'nb_oauth'
/** Supabase Auth cookies left from the previous login system. */
export const LEGACY_COOKIE = /^sb-/

export interface IssuedSession {
  accessToken: string
  accessTokenExpiresAt: number
  refreshToken?: string
  refreshTokenExpiresAt: number
  user: { id: string; nickname: string | null; provider: string }
}

interface CookieOptions {
  httpOnly: boolean
  sameSite: 'lax'
  path: string
  secure: boolean
  maxAge: number
}

interface CookieWriter {
  set(name: string, value: string, options: CookieOptions): unknown
}

export function isSecureRequest(url: string) {
  return new URL(url).protocol === 'https:'
}

function base(secure: boolean) {
  return { httpOnly: true, sameSite: 'lax' as const, path: '/', secure }
}

export function writeSessionCookies(cookies: CookieWriter, session: IssuedSession, secure: boolean, now = Date.now()) {
  const nowSeconds = Math.floor(now / 1000)
  cookies.set(ACCESS_COOKIE, session.accessToken, {
    ...base(secure),
    maxAge: Math.max(0, session.accessTokenExpiresAt - nowSeconds),
  })
  if (session.refreshToken) {
    cookies.set(REFRESH_COOKIE, session.refreshToken, {
      ...base(secure),
      maxAge: Math.max(0, session.refreshTokenExpiresAt - nowSeconds),
    })
  }
}

export function clearSessionCookies(cookies: CookieWriter, secure: boolean, legacyNames: string[] = []) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, ...legacyNames]) {
    cookies.set(name, '', { ...base(secure), maxAge: 0 })
  }
}

export function parseIssuedSession(value: unknown): IssuedSession | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const user = v.user as Record<string, unknown> | undefined
  if (typeof v.accessToken !== 'string' || typeof v.accessTokenExpiresAt !== 'number' ||
      typeof v.refreshTokenExpiresAt !== 'number' || !user || typeof user.id !== 'string') return null
  if (v.refreshToken !== undefined && (typeof v.refreshToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(v.refreshToken)))
    return null
  return {
    accessToken: v.accessToken,
    accessTokenExpiresAt: v.accessTokenExpiresAt,
    ...(typeof v.refreshToken === 'string' ? { refreshToken: v.refreshToken } : {}),
    refreshTokenExpiresAt: v.refreshTokenExpiresAt,
    user: {
      id: user.id,
      nickname: typeof user.nickname === 'string' ? user.nickname : null,
      provider: typeof user.provider === 'string' ? user.provider : 'unknown',
    },
  }
}
