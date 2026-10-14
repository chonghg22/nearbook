// Persist only anonymous build assets; never HTML/RSC, APIs, covers or avatars.
const PUBLIC_CACHE = 'nearbook-public-v2-2026-10-14'
const OFFLINE_URL = '/offline.html'
const TTL_MS = 7 * 86400000
const MAX_ENTRIES = 64
const MAX_BYTES = 2 * 1024 * 1024 // Per entry; total <=128 MiB.
const STORED_AT = 'x-nearbook-cached-at'
const STATIC_URLS = [OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png']
const OWNED_CACHE = /^(?:nearbook-public-|(?:static|images|api)-v\d+-\d{4}-\d{2}-\d{2}$)/
let writes = Promise.resolve()

function publicAsset(request) {
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search) return false
  if (request.headers.has('authorization') || request.headers.has('range') || request.headers.has('rsc')) return false
  return STATIC_URLS.includes(url.pathname) || /^\/_next\/static\/[a-zA-Z0-9_./-]+\.(?:js|css|woff2?)$/.test(url.pathname)
}

async function freshMatch(request) {
  const cache = await caches.open(PUBLIC_CACHE)
  const response = await cache.match(request)
  if (!response) return null
  const storedAt = Number(response.headers.get(STORED_AT))
  if (!storedAt || storedAt > Date.now() || Date.now() - storedAt >= TTL_MS) {
    await cache.delete(request)
    return null
  }
  return response
}

async function storePublic(request, response) {
  // A cache hit must not reset its original TTL.
  if (response.headers.has(STORED_AT)) return
  if (!publicAsset(request) || response.status !== 200 || response.redirected || response.type === 'opaque') return
  if (/\b(?:private|no-store|no-cache)\b/i.test(response.headers.get('cache-control') || '')) return
  if (/\b(?:cookie|authorization)\b|\*/i.test(response.headers.get('vary') || '') || response.headers.has('set-cookie')) return
  const mime = response.headers.get('content-type') || ''
  const path = new URL(request.url).pathname
  const validMime = path === OFFLINE_URL ? /^text\/html\b/i.test(mime)
    : path.endsWith('.js') ? /^(?:text|application)\/(?:java|ecma)script\b/i.test(mime)
      : path.endsWith('.css') ? /^text\/css\b/i.test(mime)
        : /\.woff2?$/.test(path) ? /^(?:font\/|application\/(?:font|octet-stream))/i.test(mime)
          : /^image\/png\b/i.test(mime)
  if (!validMime || Number(response.headers.get('content-length')) > MAX_BYTES) return
  const body = await response.clone().arrayBuffer()
  if (body.byteLength > MAX_BYTES) return
  const headers = new Headers(response.headers)
  headers.delete('content-encoding')
  headers.delete('content-length')
  headers.set(STORED_AT, String(Date.now()))
  const cached = new Response(body, { status: 200, headers })
  // Serialise trimming + writes to bound parallel asset requests.
  writes = writes.catch(() => {}).then(async () => {
    const cache = await caches.open(PUBLIC_CACHE)
    for (const key of await cache.keys()) await freshMatch(key)
    await cache.delete(request)
    const keys = await cache.keys()
    while (keys.length >= MAX_ENTRIES) await cache.delete(keys.shift())
    await cache.put(request, cached)
  })
  await writes
}

function assetRequest(request) {
  return new Request(request, { credentials: 'omit', cache: 'no-store' })
}

function offlineResponse() {
  return new Response('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>오프라인 | 우리동네책</title><h1>인터넷 연결이 끊겼어요</h1><p>개인정보와 도서 보유·대출 상태는 오프라인에서 표시하지 않습니다. 연결 후 다시 확인해 주세요.</p><a href="/">연결 후 홈으로 돌아가기</a></html>', {
    status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // An offline/storage failure must not prevent this privacy update activating.
    await Promise.allSettled(STATIC_URLS.map(async (url) => {
      const request = new Request(new URL(url, self.location.origin))
      await storePublic(request, await fetch(assetRequest(request)))
    }))
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    let migrating = false
    try {
      const oldKeys = (await caches.keys()).filter((key) => OWNED_CACHE.test(key) && key !== PUBLIC_CACHE)
      migrating = oldKeys.some((key) => /^(?:static|images|api)-/.test(key))
      await Promise.allSettled(oldKeys.map((key) => caches.delete(key)))
    } catch { /* New policy never reads legacy caches, even without storage. */ }
    await self.clients.claim()
    // Existing tabs may still run the old logout code/Router Cache. Revalidate
    // once during legacy migration; do not replay OAuth callback codes.
    if (migrating) {
      const windows = await self.clients.matchAll({ type: 'window' })
      await Promise.allSettled(windows.map((client) => {
        const url = new URL(client.url)
        if (url.origin !== self.location.origin || /^\/(?:auth|auth-api|login)(?:\/|$)/.test(url.pathname)) return
        return client.navigate(client.url)
      }))
    }
  })())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(new Request(request, { cache: 'no-store' })).catch(async () => {
      try {
        const fallback = await freshMatch(new Request(new URL(OFFLINE_URL, self.location.origin)))
        if (fallback) return fallback
      } catch { /* storage may be disabled */ }
      return offlineResponse()
    }))
    return
  }
  // /api/* and /_next/image: no CacheStorage reads OR writes. Holdings keeps
  // its own timeout, retry and freshness UI, not an older cached snapshot.
  if (!publicAsset(request)) return
  const network = (async () => {
    try { const cached = await freshMatch(request); if (cached) return cached } catch { /* keep network working */ }
    return fetch(assetRequest(request))
  })()
  event.respondWith(network)
  event.waitUntil(network.then((response) => storePublic(request, response)).catch(() => {}))
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  const { title, body, url } = event.data.json()
  event.waitUntil(self.registration.showNotification(title, {
    body, icon: '/icons/icon-192.png', badge: '/icons/badge-72.png', data: { url },
  }))
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow(event.notification?.data?.url || '/'))
})
