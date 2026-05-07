import { createClient } from '@/lib/supabase/client'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'

function readAccessTokenFromCookie() {
  if (typeof document === 'undefined') return null

  const projectRef = (() => {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
      return url.hostname.split('.')[0]
    } catch {
      return null
    }
  })()

  const preferredCookieName = projectRef ? `sb-${projectRef}-auth-token` : null
  const cookie = document.cookie
    .split('; ')
    .find((entry) => {
      const name = entry.split('=')[0] ?? ''
      if (preferredCookieName) {
        return name === preferredCookieName
      }
      return name.includes('-auth-token') && !name.endsWith('-code-verifier')
    })

  if (!cookie) return null

  const [, rawValue = ''] = cookie.split('=')
  const encoded = decodeURIComponent(rawValue)

  try {
    const normalized = encoded.startsWith('base64-') ? encoded.slice('base64-'.length) : encoded
    const base64 = normalized.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const decoded = atob(padded)
    const parsed = JSON.parse(decoded) as { access_token?: string } | { currentSession?: { access_token?: string } }

    if ('access_token' in parsed && typeof parsed.access_token === 'string') {
      return parsed.access_token
    }

    if ('currentSession' in parsed && typeof parsed.currentSession?.access_token === 'string') {
      return parsed.currentSession.access_token
    }
  } catch {
    return null
  }

  return null
}

async function withAuthHeaders(options: RequestInit = {}) {
  const supabase = createClient()
  let {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    await supabase.auth.getUser()
    const refreshed = await supabase.auth.getSession()
    session = refreshed.data.session
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  const accessToken = session?.access_token ?? readAccessTokenFromCookie()

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  return { ...options, headers }
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const requestInit = await withAuthHeaders(options)

  return fetch(`${API_BASE}${path}`, requestInit)
}

export async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const requestInit = await withAuthHeaders(options)

  return fetch(path, { credentials: 'include', ...requestInit })
}
