import test from 'node:test'
import assert from 'node:assert/strict'
import { curationTiming, loadExploreItems, parseExploreItems, validLibraryId, validPeriod } from '../lib/explore-data.mjs'

const book = { isbn: '9788936434120', title: '소년이 온다', loanCount: 12 }
const json = (data) => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } })

test('success, empty, and failures have distinct states; requests are no-store', async () => {
  let init
  const success = await loadExploreItems('https://api.example/books', 'books', {
    fetchImpl: async (_, options) => { init = options; return json({ data: [book] }) },
  })
  assert.equal(success.status, 'ready')
  assert.equal(success.items[0].title, book.title)
  assert.equal(init.cache, 'no-store')
  assert.equal((await loadExploreItems('x', 'books', { fetchImpl: async () => json({ data: [] }) })).status, 'empty')
})

for (const status of [404, 429, 500, 503]) {
  test(`HTTP ${status} is an error, never empty`, async () => {
    assert.deepEqual(await loadExploreItems('x', 'books', { fetchImpl: async () => new Response('private upstream body', { status }) }), { status: 'error', items: [] })
  })
}
test('network and malformed JSON are errors', async () => {
  for (const fetchImpl of [async () => { throw new Error('secret detail') }, async () => new Response('not json')]) {
    assert.equal((await loadExploreItems('x', 'books', { fetchImpl })).status, 'error')
  }
})
test('timeout includes a stalled JSON body and fetch; abort signal is set', async () => {
  let signal
  const pending = new Promise(() => {})
  const result = await loadExploreItems('x', 'books', { timeoutMs: 5, fetchImpl: async (_, init) => {
    signal = init.signal
    return { ok: true, status: 200, json: () => pending }
  } })
  assert.equal(result.status, 'error')
  assert.equal(signal.aborted, true)
  assert.equal((await loadExploreItems('x', 'books', { timeoutMs: 5, fetchImpl: () => pending })).status, 'error')
})
for (const payload of [{}, { data: null }, { data: {} }, { data: [null] }, { data: [{ ...book, title: '' }] },
  { data: [{ ...book, isbn: '../admin' }] }, { data: [{ ...book, loanCount: '12' }] }, { data: Array(501).fill(book) }]) {
  test(`bad schema is error: ${JSON.stringify(payload).slice(0,90)}`, async () => {
    assert.equal((await loadExploreItems('x', 'books', { fetchImpl: async () => json(payload) })).status, 'error')
  })
}
test('category codes preserve leading zeros and metadata, not a fabricated fresh date', () => {
  const items = parseExploreItems({ data: [{ code: '00', count: 40, periodKey: '2026-07' }] }, 'categories')
  assert.equal(items[0].code, '00')
  assert.equal(items[0].curationPeriod, '2026-07')
  assert.equal(items[0].fetchedAt, null)
})
test('library responses preserve selector information; invalid IDs do not reach paths', () => {
  const item = parseExploreItems({ data: [{ id: 126024, name: '해운대도서관', bookCount: 40, periodKey: '2026-07' }] }, 'libraries')[0]
  assert.equal(item.id, 126024)
  assert.equal(item.bookCount, 40)
  assert.equal(validLibraryId('126024'), '126024')
  for (const id of ['', '0', '01', '-1', '../', '126024&x=1', ['126024'], undefined]) assert.equal(validLibraryId(id), null)
  assert.throws(() => parseExploreItems({ data: [{ id: 0, name: 'x' }] }, 'libraries'))
})
test('unsupported cover URL becomes placeholder; no unsafe image is rendered', () => {
  for (const coverUrl of ['javascript:alert(1)', 'https://untrusted.example/x', 'https://user:pass@image.aladin.co.kr/a']) {
    assert.equal(parseExploreItems({ data: [{ ...book, coverUrl }] }, 'books')[0].coverUrl, null)
  }
  assert.equal(parseExploreItems({ data: [{ ...book, coverUrl: 'http://image.aladin.co.kr/a.jpg' }] }, 'books')[0].coverUrl, 'http://image.aladin.co.kr/a.jpg')
})
const now = Date.parse('2026-10-13T01:00:00Z')
test('old stored period is stale even when the collection timestamp is absent', () => {
  assert.deepEqual(curationTiming([{}], { curationPeriod: '2026-07' }, now), { period: '2026-07', collectedAt: null, state: 'stale' })
})
test('book timing takes precedence over auxiliary category timing', () => {
  assert.equal(curationTiming([{ curationPeriod: '2026-06' }], { curationPeriod: '2026-10' }, now).period, '2026-06')
})
test('recent timestamp is known, old is stale, and future/missing timestamps are unknown', () => {
  assert.equal(curationTiming([{ fetchedAt: '2026-10-13T00:00:00Z' }], undefined, now).state, 'known')
  assert.equal(curationTiming([{ fetchedAt: '2026-10-01T00:00:00Z' }], undefined, now).state, 'stale')
  assert.equal(curationTiming([{ fetchedAt: '2027-01-01T00:00:00Z' }], undefined, now).state, 'unknown')
  assert.equal(curationTiming([{}], undefined, now).state, 'unknown')
})
test('daily period comparison uses KST calendar day, not UTC day', () => {
  assert.equal(curationTiming([{ curationPeriod: '2026-10-12' }], undefined, Date.parse('2026-10-12T15:01:00Z')).state, 'stale')
})
test('invalid periods are ignored and the oldest item determines snapshot age', () => {
  for (const p of ['2026-13', '2026-02-30', 'not-date', '2026-1']) assert.equal(validPeriod(p), null)
  assert.equal(curationTiming([{ curationPeriod: '2026-10' }, { curationPeriod: '2026-07' }], undefined, now).period, '2026-07')
})
