const ANONYMOUS_ID_KEY = 'nearbook-anonymous-id'
const SESSION_ID_KEY = 'nearbook-session-id'
const SESSION_STARTED_AT_KEY = 'nearbook-session-started-at'
const SOURCE_KEY = 'nearbook-source'
const SESSION_TTL_MS = 30 * 60 * 1000
const VISIT_KEY = 'nearbook-visit-marked'

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
  window.sessionStorage.removeItem(SOURCE_KEY)
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
    // Query metadata is explicit: never copy auth tokens, coordinates or arbitrary URL parameters.
    const search = new URLSearchParams()
    const params = new URLSearchParams(window.location.search)
    const publicPath = !/^\/(?:me|login|auth|unsubscribe|digest|api)(?:\/|$)/.test(
      window.location.pathname
    )
    for (const key of publicPath
      ? [
          'source',
          ...(window.location.pathname === '/search' ? ['q', 'searchType', 'sort', 'page'] : []),
        ]
      : []) {
      const value = params.get(key)
      if (value !== null) search.set(key, value)
    }

    const send = (eventType: string, eventPayload: Record<string, unknown>) =>
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: eventType,
          payload: {
            ...eventPayload,
            schemaVersion: 2,
            eventId: createId('evt'),
            clientTimeMs: Date.now(),
            anonymousId,
            ...(source && { trafficSource: source }),
          },
          sessionId,
          pathname: window.location.pathname.slice(0, 256),
          search: search.size ? `?${search.toString()}`.slice(0, 512) : '',
          at: new Date().toISOString(),
        }),
        keepalive: true,
      })
    // Mark synchronously: concurrent effects/StrictMode share one visit. Delivery is
    // best effort, with no retries or claim of exactly-once ingestion.
    if (
      !/^\/(?:me|login|auth|unsubscribe|digest|api)(?:\/|$)/.test(window.location.pathname) &&
      window.sessionStorage.getItem(VISIT_KEY) !== sessionId
    ) {
      window.sessionStorage.setItem(VISIT_KEY, sessionId)
      void send('visit', {}).catch(() => {})
    }
    await send(type, payload)
  } catch {
    // ignore analytics failures
  }
}
