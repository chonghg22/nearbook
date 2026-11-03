'use client'
// Browser auth client for Nearbook-issued sessions. It keeps the small surface the app used from
// Supabase (getSession/getUser/onAuthStateChange/signOut) so components keep their account boundaries.
// Tokens live in httpOnly cookies; the access token is read only through same-origin /auth-api/session.

export interface AuthUser {
  id: string
  email?: string
  app_metadata: { provider: string }
  user_metadata: { nickname?: string; name?: string; avatar_url?: string }
}

export interface AuthSession {
  access_token: string
  expires_at: number
  user: AuthUser
}

export type AuthEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED'
type Listener = (event: AuthEvent, session: AuthSession | null) => void

const EXPIRY_MARGIN_SECONDS = 30
const CHANNEL = 'nearbook-auth'

let cached: AuthSession | null | undefined
let inflight: Promise<AuthSession | null> | null = null
const listeners = new Set<Listener>()
let channel: BroadcastChannel | null = null
let watching = false

function parseSession(value: unknown): AuthSession | null {
  const session = (value as { session?: unknown } | null)?.session as Record<string, unknown> | null | undefined
  if (!session || typeof session.access_token !== 'string' || typeof session.expires_at !== 'number') return null
  const user = session.user as AuthUser | undefined
  if (!user || typeof user.id !== 'string') return null
  return { access_token: session.access_token, expires_at: session.expires_at, user }
}

function usable(session: AuthSession | null | undefined): session is AuthSession {
  return Boolean(session && session.expires_at - Date.now() / 1000 > EXPIRY_MARGIN_SECONDS)
}

/** Network failures keep the last known state so an offline PWA does not look like a logout. */
async function load(): Promise<AuthSession | null> {
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const response = await fetch('/auth-api/session', { credentials: 'same-origin', cache: 'no-store' })
      if (!response.ok) return cached ?? null
      return parseSession(await response.json())
    } catch {
      return cached ?? null
    } finally {
      inflight = null
    }
  })()
  return inflight
}

function emit(event: AuthEvent, session: AuthSession | null) {
  for (const listener of [...listeners]) {
    try {
      listener(event, session)
    } catch {
      /* A listener failure must not block other account boundaries. */
    }
  }
}

async function revalidate() {
  const previous = cached
  const next = await load()
  cached = next
  const before = previous?.user.id ?? null
  const after = next?.user.id ?? null
  if (before !== after) emit(after ? 'SIGNED_IN' : 'SIGNED_OUT', next)
  else if (next && previous && next.access_token !== previous.access_token) emit('TOKEN_REFRESHED', next)
}

function watch() {
  if (watching || typeof window === 'undefined') return
  watching = true
  // Another tab logging in/out, or returning to this tab, re-checks the server cookie state.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void revalidate()
  })
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL)
    channel.onmessage = () => void revalidate()
  }
}

async function getSession(): Promise<AuthSession | null> {
  if (usable(cached)) return cached
  const previous = cached as AuthSession | null | undefined
  const next = await load()
  cached = next
  if (previous !== undefined && (previous?.user.id ?? null) !== (next?.user.id ?? null))
    emit(next ? 'SIGNED_IN' : 'SIGNED_OUT', next)
  return next
}

const auth = {
  async getSession() {
    return { data: { session: await getSession() }, error: null }
  },
  async getUser() {
    return { data: { user: (await getSession())?.user ?? null }, error: null }
  },
  onAuthStateChange(listener: Listener) {
    watch()
    listeners.add(listener)
    let active = true
    void getSession().then((session) => {
      if (active) listener('INITIAL_SESSION', session)
    })
    return {
      data: {
        subscription: {
          unsubscribe() {
            active = false
            listeners.delete(listener)
          },
        },
      },
    }
  },
  async signOut() {
    try {
      await fetch('/auth-api/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store' })
    } finally {
      cached = null
      emit('SIGNED_OUT', null)
      channel?.postMessage('changed')
    }
    return { error: null }
  },
}

export function createClient() {
  return { auth }
}

/** Test-only reset of module state. */
export function __resetAuthClientForTests() {
  cached = undefined
  inflight = null
  listeners.clear()
}
