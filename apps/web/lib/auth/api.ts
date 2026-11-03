// Server/Edge-only calls from the web tier to the Nearbook API auth endpoints.
import { isProductionApiEnvironment, resolveServerApiBaseUrl } from '../api-base-url.mjs'
import { parseIssuedSession, type IssuedSession } from './session-cookies'

const TIMEOUT_MS = 8_000

function apiBase() {
  return resolveServerApiBaseUrl({
    internalUrl: process.env.INTERNAL_API_URL,
    publicUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    production: isProductionApiEnvironment({ vercelEnv: process.env.VERCEL_ENV, appEnv: process.env.APP_ENV }),
  })
}

export type AuthApiResult =
  | { status: 'ok'; session: IssuedSession }
  | { status: 'rejected' } // definitive 4xx: the credential is unusable
  | { status: 'unavailable' } // network/5xx/misconfiguration: keep existing cookies

async function post(path: string, body: unknown, userAgent?: string | null): Promise<AuthApiResult> {
  let response: Response
  try {
    response = await fetch(`${apiBase()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userAgent ? { 'User-Agent': userAgent.slice(0, 256) } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    return { status: 'unavailable' }
  }
  if (response.status >= 400 && response.status < 500 && response.status !== 429) return { status: 'rejected' }
  if (!response.ok) return { status: 'unavailable' }
  try {
    const session = parseIssuedSession(await response.json())
    return session ? { status: 'ok', session } : { status: 'unavailable' }
  } catch {
    return { status: 'unavailable' }
  }
}

export function openKakaoSession(code: string, redirectUri: string, userAgent?: string | null) {
  return post('/auth/kakao/session', { code, redirectUri }, userAgent)
}

export function refreshSession(refreshToken: string) {
  return post('/auth/refresh', { refreshToken })
}

export async function revokeSession(refreshToken: string) {
  try {
    await fetch(`${apiBase()}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    /* Cookies are cleared regardless; the server session then expires on its own. */
  }
}
