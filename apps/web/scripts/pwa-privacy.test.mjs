import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { accountBoundary, clearPwaCaches } from '../lib/pwa-privacy.mjs'

const code = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
const origin = 'https://www.near-book.com'
const current = 'nearbook-public-v2-2026-10-14'
const legacy = ['api-v1-2026-05-12', 'static-v1-2026-05-12', 'images-v1-2026-05-12']
const response = (body = 'public', headers = {}) => new Response(body, { headers: { 'content-type': 'text/javascript', ...headers } })
function harness() {
  let clock = Date.parse('2026-10-14T00:00:00Z')
  const handlers = {}, stores = new Map(), requests = [], navigations = []
  let offline = false, failStorage = false, skipped = false, claimed = false
  const cacheStorage = {
    keys: async () => { if (failStorage) throw Error('storage'); return [...stores.keys()] },
    delete: async (name) => stores.delete(name),
    open: async (name) => {
      if (failStorage) throw Error('storage')
      if (!stores.has(name)) stores.set(name, new Map())
      const map = stores.get(name)
      const key = (request) => new URL(typeof request === 'string' ? request : request.url, origin).href
      return {
        keys: async () => [...map.keys()].map((url) => new Request(url)),
        match: async (request) => map.get(key(request))?.clone(),
        delete: async (request) => map.delete(key(request)),
        put: async (request, result) => { map.set(key(request), result.clone()) },
      }
    },
  }
  const h = { stores, cacheStorage, requests, handlers, navigations, reply: (req) => req.url.endsWith('/offline.html')
    ? response('인터넷 연결이 끊겼어요. 개인정보와 도서 보유·대출 상태는 표시하지 않습니다.', { 'content-type': 'text/html' })
    : req.url.includes('/icons/') ? response('png', { 'content-type': 'image/png' }) : response(),
    advance: (ms) => { clock += ms }, offline: () => { offline = true }, storageFailure: () => { failStorage = true },
    get skipped() { return skipped }, get claimed() { return claimed },
  }
  vm.runInNewContext(code, { URL, Request, Response, Headers, Promise,
    Date: class extends Date { static now() { return clock } }, caches: cacheStorage,
    self: { location: { origin }, addEventListener: (type, fn) => { handlers[type] = fn },
      skipWaiting: async () => { skipped = true }, clients: { claim: async () => { claimed = true },
        matchAll: async () => ['/me/wishlist', '/book/123', '/auth/callback?code=fake', '/login'].map((path) => ({
          url: origin + path, navigate: async (url) => { navigations.push(url) },
        })) } },
    fetch: async (req) => { requests.push(req); if (offline) throw Error('offline'); return h.reply(req) },
  })
  h.dispatch = async (path, options = {}) => {
    const request = new Request(new URL(path, origin), options)
    if (options.navigate) Object.defineProperty(request, 'mode', { value: 'navigate' })
    const pending = []; let result
    handlers.fetch({ request, respondWith: (p) => { result = p }, waitUntil: (p) => pending.push(p) })
    const out = result ? await result : undefined
    await Promise.all(pending)
    return out
  }
  h.lifecycle = async (type) => {
    const pending = []; handlers[type]({ waitUntil: (p) => pending.push(p) }); await Promise.all(pending)
  }
  h.seed = async (name, path, body, headers = {}) => {
    const cache = await cacheStorage.open(name)
    await cache.put(new Request(new URL(path, origin)), response(body, headers))
  }
  return h
}

for (const path of ['/api/me', '/api/me/notification-preferences', '/api/wishlists', '/api/books/123/holdings?lat=37&lng=127',
  '/api/books/search?q=book', '/me/wishlist?_rsc=abc', '/auth/callback?code=private', '/auth-api/logout',
  '/_next/image?url=avatar', '/avatar.png', 'https://external.example/photo.png']) {
  test(`does not intercept/store/read ${path}`, async () => {
    const h = harness()
    await h.seed(legacy[0], path, 'ACCOUNT_A_SECRET')
    assert.equal(await h.dispatch(path), undefined)
    assert.equal(h.requests.length, 0)
    assert.equal(h.stores.has(current), false)
  })
}
for (const options of [{ method: 'POST' }, { headers: { authorization: 'Bearer fake' } },
  { headers: { rsc: '1' } }, { headers: { range: 'bytes=0-1' } }]) {
  test('authenticated, RSC, ranged and non-GET assets bypass caches', async () => {
    const h = harness()
    assert.equal(await h.dispatch('/_next/static/build/app.js', options), undefined)
    assert.equal(h.stores.size, 0)
  })
}
test('install precaches only cookie-free public assets, not pages or API', async () => {
  const h = harness(); await h.lifecycle('install')
  assert.equal(h.skipped, true)
  assert.equal(h.stores.get(current).size, 3)
  for (const req of h.requests) { assert.equal(req.credentials, 'omit'); assert.equal(req.cache, 'no-store') }
})
test('migration deletes legacy personal data but preserves unrelated caches', async () => {
  const h = harness()
  for (const name of [...legacy, 'nearbook-public-old', 'other-app-v1']) await h.seed(name, '/me', 'secret')
  await h.lifecycle('install'); await h.lifecycle('activate')
  assert.deepEqual([...h.stores.keys()].sort(), [current, 'other-app-v1'].sort())
  assert.equal(h.claimed, true)
  assert.deepEqual(h.navigations, [origin + '/me/wishlist', origin + '/book/123'])
})
test('A → logout → B → offline never serves A HTML or old API', async () => {
  const h = harness()
  for (const name of legacy) await h.seed(name, '/me/wishlist', 'ACCOUNT_A_SECRET')
  await h.lifecycle('install'); await h.lifecycle('activate')
  h.reply = () => response('ACCOUNT_A_SECRET', { 'content-type': 'text/html' })
  assert.equal(await (await h.dispatch('/me/wishlist', { navigate: true })).text(), 'ACCOUNT_A_SECRET')
  assert.equal(h.requests.at(-1).cache, 'no-store')
  assert.equal(h.stores.get(current).size, 3)
  await clearPwaCaches(h.cacheStorage, true)
  h.reply = () => response('ACCOUNT_B_ONLY', { 'content-type': 'text/html' })
  assert.equal(await (await h.dispatch('/me/wishlist', { navigate: true })).text(), 'ACCOUNT_B_ONLY')
  h.offline()
  for (const path of ['/me/wishlist', '/login', '/auth/callback?code=secret', '/book/123']) {
    const out = await h.dispatch(path, { navigate: true })
    assert.equal(out.status, 503)
    const body = await out.text()
    assert.match(body, /인터넷 연결/)
    assert.doesNotMatch(body, /ACCOUNT_A_SECRET|ACCOUNT_B_ONLY/)
  }
  assert.equal(await h.dispatch('/api/me'), undefined)
})
test('offline navigation uses standalone fallback, never a cached user page', async () => {
  const h = harness(); await h.lifecycle('install'); h.offline()
  await h.seed(legacy[1], '/me/wishlist', 'ACCOUNT_A_SECRET')
  const body = await (await h.dispatch('/me/wishlist', { navigate: true })).text()
  assert.match(body, /개인정보/); assert.doesNotMatch(body, /ACCOUNT_A_SECRET/)
})
test('cached public asset works offline without resetting original TTL', async () => {
  const h = harness(); const path = '/_next/static/build/app.js'
  await h.dispatch(path); const initial = h.stores.get(current).get(origin + path).headers.get('x-nearbook-cached-at')
  h.advance(1000); h.offline()
  assert.equal(await (await h.dispatch(path)).text(), 'public')
  assert.equal(h.stores.get(current).get(origin + path).headers.get('x-nearbook-cached-at'), initial)
  h.advance(7 * 86400000)
  await assert.rejects(h.dispatch(path), /offline/)
  assert.equal(h.stores.get(current).has(origin + path), false)
})
test('missing/future timestamps are evicted rather than served offline', async () => {
  for (const stamp of [undefined, '9999999999999999', 'bad']) {
    const h = harness()
    await h.seed(current, '/_next/static/build/a.js', 'stale', stamp ? { 'x-nearbook-cached-at': stamp } : {})
    h.offline(); await assert.rejects(h.dispatch('/_next/static/build/a.js'))
  }
})
for (const headers of [{ 'cache-control': 'private' }, { 'cache-control': 'no-store' }, { 'cache-control': 'no-cache' },
  { vary: 'Cookie' }, { vary: 'Authorization' }, { vary: '*' }, { 'set-cookie': 'fake' }, { 'content-type': 'text/html' }]) {
  test('rejects private, cookie-dependent or wrong-MIME asset responses', async () => {
    const h = harness(); h.reply = () => response('not-safe', headers)
    await h.dispatch('/_next/static/build/app.js')
    assert.equal(h.stores.get(current).size, 0)
  })
}
test('errors and redirected assets are not stored', async () => {
  const h = harness()
  for (const out of [new Response('error', { status: 500 }), Response.redirect(origin + '/login'),
    Object.defineProperty(response(), 'redirected', { value: true })]) {
    h.reply = () => out; await h.dispatch('/_next/static/build/app.js')
    assert.equal(h.stores.get(current).size, 0)
  }
})
test('caps concurrent cache writes at 64 entries', async () => {
  const h = harness()
  await Promise.all(Array.from({ length: 70 }, (_, n) => h.dispatch(`/_next/static/build/${n}.js`)))
  assert.equal(h.stores.get(current).size, 64)
})
test('rejects entries over 2 MiB, even without Content-Length', async () => {
  const h = harness(); h.reply = () => response(new Uint8Array(2 * 1024 * 1024 + 1))
  await h.dispatch('/_next/static/build/app.js'); assert.equal(h.stores.get(current).size, 0)
})
test('storage/network failure does not block privacy worker activation or offline fallback', async () => {
  const h = harness(); h.storageFailure(); h.offline()
  await h.lifecycle('install'); await h.lifecycle('activate')
  assert.equal(h.skipped, true); assert.equal(h.claimed, true)
  assert.equal((await h.dispatch('/me', { navigate: true })).status, 503)
})
test('client cleanup preserves unrelated caches and works without CacheStorage', async () => {
  const h = harness()
  for (const name of [...legacy, current, 'other-app-v1']) await h.seed(name, '/me', 'secret')
  await clearPwaCaches(h.cacheStorage)
  assert.deepEqual([...h.stores.keys()], [current, 'other-app-v1'])
  await clearPwaCaches(h.cacheStorage, true)
  assert.deepEqual([...h.stores.keys()], ['other-app-v1'])
  await clearPwaCaches(undefined)
})
for (const pair of [['A', null], ['A', 'B'], [null, 'B']]) {
  test(`identity change ${pair.join(' → ')} hides before cleanup and full navigation`, async () => {
    const events = []
    const observe = accountBoundary({ hide: () => events.push('hide'), clear: async () => { events.push('clear') }, reload: () => events.push('reload') })
    observe(pair[0]); observe(pair[0]); assert.deepEqual(events, [])
    assert.equal(observe(pair[1]), undefined); assert.deepEqual(events, ['hide'])
    observe(pair[1]); await new Promise((r) => setImmediate(r))
    assert.deepEqual(events, ['hide', 'clear', 'reload'])
  })
}
test('token refresh does not reload and cleanup failure still drops mounted private state', async () => {
  const events = []
  const observe = accountBoundary({ hide: () => events.push('hide'), clear: async () => { throw Error('storage') }, reload: () => events.push('reload') })
  observe('A'); observe('A'); assert.deepEqual(events, [])
  observe(null); await new Promise((r) => setImmediate(r)); assert.deepEqual(events, ['hide', 'reload'])
})
test('registration, logout, BFCache and offline copy are privacy-wired', async () => {
  const reg = await readFile(new URL('../components/pwa/register-sw.tsx', import.meta.url), 'utf8')
  const logout = await readFile(new URL('../components/layout/user-nav-menu.tsx', import.meta.url), 'utf8')
  const offline = await readFile(new URL('../public/offline.html', import.meta.url), 'utf8')
  assert.match(reg, /onAuthStateChange/); assert.match(reg, /event.persisted/); assert.match(reg, /updateViaCache: 'none'/)
  assert.match(reg, /subscription.unsubscribe/); assert.match(reg, /accountLogout/)
  assert.match(logout, /clearPwaCaches\(window.caches, true\)/); assert.match(logout, /window.location.replace/)
  assert.doesNotMatch(logout, /router.push|router.refresh/)
  assert.doesNotMatch(offline, /<script|\/me\/|ACCOUNT_|최근에 본 책 페이지/)
  assert.match(offline, /오프라인에서 표시하지 않습니다/)
})
