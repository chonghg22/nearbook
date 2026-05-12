export async function trackEvent(type: string, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return

  try {
    await fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        payload,
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
