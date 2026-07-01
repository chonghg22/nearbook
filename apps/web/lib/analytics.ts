const ANONYMOUS_ID_KEY = 'nearbook-anonymous-id'
const SESSION_ID_KEY = 'nearbook-session-id'
const SESSION_STARTED_AT_KEY = 'nearbook-session-started-at'
const SOURCE_KEY = 'nearbook-source'
const SESSION_TTL_MS = 30 * 60 * 1000

function createId(prefix: string) {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}_${random}`
}

function getAnonymousId() {
  const existing = window.localStorage.getItem(ANONYMOUS_ID_KEY)
  if (existing) return existing

  const next = createId('anon')
  window.localStorage.setItem(ANONYMOUS_ID_KEY, next)
  return next
}

function getSessionId() {
  const now = Date.now()
  const startedAt = Number(window.sessionStorage.getItem(SESSION_STARTED_AT_KEY) || 0)
  const existing = window.sessionStorage.getItem(SESSION_ID_KEY)

  if (existing && startedAt && now - startedAt < SESSION_TTL_MS) {
    window.sessionStorage.setItem(SESSION_STARTED_AT_KEY, String(now))
    return existing
  }

  const next = createId('sess')
  window.sessionStorage.setItem(SESSION_ID_KEY, next)
  window.sessionStorage.setItem(SESSION_STARTED_AT_KEY, String(now))
  return next
}

function getSource() {
  const params = new URLSearchParams(window.location.search)
  const source = params.get('source')?.trim()

  if (source) {
    const normalized = source.slice(0, 80)
    window.sessionStorage.setItem(SOURCE_KEY, normalized)
    return normalized
  }

  return window.sessionStorage.getItem(SOURCE_KEY) || undefined
}

export async function trackEvent(type: string, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return

  try {
    const sessionId = getSessionId()
    const anonymousId = getAnonymousId()
    const source = getSource()

    await fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        payload: {
          ...payload,
          anonymousId,
          ...(source && { trafficSource: source }),
        },
        sessionId,
        pathname: window.location.pathname,
        search: window.location.search,
        at: new Date().toISOString(),
      }),
      keepalive: true,
    })
  } catch {
    // ignore analytics failures
  }
}
