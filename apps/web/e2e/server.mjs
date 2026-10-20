// Local test double for both SSR and browser API/auth requests. No upstreams.
import { createServer } from 'node:http'
export const isbn = '9791161571195'
const book = { isbn, title: '회귀 검증을 위한 책', author: '검증 저자', publisher: '검증 출판사', coverUrl: null, publishedYear: 2026 }
const library = { id: 111314, name: '검증 도서관', address: '서울시 검증 주소', region: '서울특별시 중구',
  lat: 37.5665, lng: 126.978, phone: null, homepage: 'https://library.example.test/',
  operatingHours: { text: '평일 09:00~18:00', closed: '매주 월요일' } }
const directory = [library, ...[111315, 111316].map((id) => ({ ...library, id, name: `지역 검증 도서관 ${id}` })),
  { ...library, id: 222001, name: '소규모 지역 도서관', region: '부산광역시 중구' }]
const initialState = () => ({ added: {}, writes: 0, saveFailure: false, searchStatus: 200, events: [] })
let state = initialState()
function user(id) {
  return { id, aud: 'authenticated', role: 'authenticated', email: `${id}@example.test`,
    app_metadata: { provider: 'kakao' }, user_metadata: { nickname: '검증 독자' }, created_at: '2026-01-01T00:00:00Z' }
}
function identity(req) {
  try { return JSON.parse(Buffer.from(req.headers.authorization.split('.')[1], 'base64url')).sub } catch { return 'anonymous' }
}
function holdings() {
  const at = new Date().toISOString()
  return {
    libraries: [{ ...library, status: 'available', hasBook: true, loanAvailable: true,
      source: 'jeongbonaru:bookExist', checkedAt: at, lastAttemptAt: at, stale: false, distanceKm: 0.5 }],
    holdings: { source: 'jeongbonaru:bookExist', nearbyCount: 1, attemptedCount: 1, checkedCount: 1,
      heldCount: 1, availableCount: 1, borrowedCount: 0, notHeldCount: 0, unknownCount: 0, uncheckedCount: 0, limited: false },
  }
}
const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:3100')
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,content-type,x-client-info,x-supabase-api-version')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json')
  if (req.method === 'OPTIONS') { res.end(); return }
  let body = ''
  for await (const chunk of req) body += chunk
  const path = new URL(req.url, 'http://127.0.0.1:4101').pathname
  const send = (data, status = 200) => { res.statusCode = status; res.end(JSON.stringify(data)) }
  if (path === '/__health') return send({ ok: true })
  if (path === '/__reset' && req.method === 'POST') { state = { ...initialState(), ...JSON.parse(body || '{}') }; return send(state) }
  if (path === '/__state') return send(state)
  if (path === '/analytics/event' && req.method === 'POST') { state.events.push(JSON.parse(body)); return send({ ok: true }, 202) }
  if (path === '/auth/v1/user') return send(user(identity(req)))
  if (path === '/auth/v1/logout') return send({})
  if (path === '/search') return send({ data: { items: [book], total: 1, page: 1, pageSize: 10 } }, state.searchStatus)
  if (path === '/search/suggest') return send({ data: [book] })
  if (path === `/books/${isbn}`) return send(book)
  if (path === `/books/${isbn}/holdings`) return send(holdings())
  if (path === `/books/${isbn}/analysis`) return send({ data: {} })
  if (path === '/libraries/111314') return send({ data: library })
  if (path === '/libraries') return send({ data: directory })
  if (path === '/libraries/near' || path === '/libraries/by-region') return send({ data: [library] })
  if (path.startsWith('/me/') || path === '/wishlists' || path.startsWith('/wishlists/')) {
    const id = identity(req)
    if (id === 'anonymous') return send({ error: 'authentication_required' }, 401)
    if (path.endsWith('/status')) return send({ data: { added: !!state.added[id] } })
    if (path === '/me/wishlists') return send({ data: state.added[id] ? [{ ...book, title: `독자 ${id}의 비공개 책`, addedAt: new Date().toISOString(), note: null }] : [], meta: { plan: 'free', total: state.added[id] ? 1 : 0 } })
    if (path === '/me/library-cards') return send({ data: [], meta: { plan: 'free', total: 0 } })
    if (req.method === 'POST' || req.method === 'DELETE') {
      state.writes++
      if (state.saveFailure) return send({ error: 'fixture_unavailable' }, 503)
      state.added[id] = req.method === 'POST'
      return send({ ok: true })
    }
  }
  // Stored optional curations/analysis may legitimately be empty.
  if (req.method === 'GET') return send({ data: [] })
  return send({ ok: true })
})
server.listen(4101, '127.0.0.1')
process.on('SIGTERM', () => server.close(() => process.exit()))
