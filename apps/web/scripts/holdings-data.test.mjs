import test from 'node:test'
import assert from 'node:assert/strict'
import { holdingsMessage, loadHoldings, parseHoldings } from '../lib/holdings-data.mjs'

const now = Date.parse('2026-10-14T00:00:00Z')
const row = (status = 'available', id = 111314) => ({ id, name: '서울도서관', distanceKm: 0.5, status,
  hasBook: status === 'not_held' ? false : status === 'unknown' ? null : true,
  loanAvailable: status === 'available' ? true : status === 'unknown' ? null : false,
  checkedAt: status === 'unknown' ? null : new Date(now).toISOString(), lastAttemptAt: new Date(now).toISOString(),
  stale: false, source: 'jeongbonaru:bookExist' })
function payload(rows = [], nearbyCount = rows.length) {
  return { libraries: rows, holdings: { nearbyCount, attemptedCount: rows.length,
    checkedCount: rows.filter((r) => r.status !== 'unknown').length, heldCount: rows.filter((r) => r.hasBook === true).length,
    availableCount: rows.filter((r) => r.status === 'available').length, borrowedCount: rows.filter((r) => r.status === 'borrowed').length,
    notHeldCount: rows.filter((r) => r.status === 'not_held').length, unknownCount: rows.filter((r) => r.status === 'unknown').length,
    uncheckedCount: nearbyCount - rows.length, limited: nearbyCount > rows.length, source: 'jeongbonaru:bookExist' } }
}
const fetchJson = (data, status = 200) => async () => new Response(JSON.stringify(data), { status })

for (const status of ['available', 'borrowed', 'not_held', 'unknown']) {
  test(`validates ${status} without inventing copy counts`, () => {
    const result = parseHoldings(payload([row(status)]), now)
    assert.equal(result.libraries[0].status, status)
    assert.equal('holdingCount' in result.libraries[0], false)
  })
}
test('distinguishes no nearby libraries from confirmed nonownership', () => {
  assert.match(holdingsMessage(parseHoldings(payload(), now)), /도서관을 찾지 못/)
  assert.match(holdingsMessage(parseHoldings(payload([row('not_held')]), now)), /소장하지 않는/)
})
test('does not claim absence during unknown status or limited coverage', () => {
  assert.match(holdingsMessage(parseHoldings(payload([row('unknown')]), now)), /책이 없다는 뜻은 아닙니다/)
  assert.match(holdingsMessage(parseHoldings(payload([row('not_held')], 30), now)), /모든 도서관을 확인한 결과는 아닙니다/)
})
test('keeps partial results alongside unknown rows', () => {
  const result = parseHoldings(payload([row(), row('unknown', 111315)]), now)
  assert.equal(result.holdings.heldCount, 1)
  assert.equal(result.holdings.unknownCount, 1)
  assert.equal(holdingsMessage(result), null)
})
test('recognizes elapsed five-minute freshness without changing checkedAt', () => {
  const p = payload([row()])
  assert.equal(parseHoldings(p, now + 299999).libraries[0].stale, false)
  const result = parseHoldings(p, now + 300000)
  assert.equal(result.libraries[0].stale, true)
  assert.equal(result.libraries[0].checkedAt, p.libraries[0].checkedAt)
})
for (const malformed of [null, {}, { libraries: [] }, { libraries: [{ holdingCount: 0, loanAvailable: 0 }] },
  payload([{ ...row(), id: '../login' }]), payload([{ ...row(), status: 'none' }]),
  payload([{ ...row(), hasBook: false }]), payload([{ ...row(), checkedAt: null }]),
  payload([{ ...row(), checkedAt: 'bad date' }]), payload([{ ...row(), distanceKm: -1 }]),
  payload([row(), row()]), { ...payload([row()]), holdings: { ...payload([row()]).holdings, availableCount: 3 } }]) {
  test('rejects invalid holdings contract', () => assert.throws(() => parseHoldings(malformed, now)))
}
for (const status of [404, 429, 500, 503]) {
  test(`HTTP ${status} never becomes an empty result`, async () => {
    await assert.rejects(loadHoldings('https://example.test/holdings', { fetchImpl: fetchJson({ secret: 'body' }, status) }))
  })
}
test('network failure remains an error and retry recovers', async () => {
  await assert.rejects(loadHoldings('https://example.test', { fetchImpl: async () => { throw new Error('network') } }))
  const time = new Date().toISOString()
  const current = payload([{ ...row(), checkedAt: time, lastAttemptAt: time }])
  assert.equal((await loadHoldings('https://example.test', { fetchImpl: fetchJson(current) })).libraries.length, 1)
})
test('whole fetch timeout aborts transport', async () => {
  let signal
  await assert.rejects(loadHoldings('https://example.test', { timeoutMs: 10, fetchImpl: async (_, opts) => {
    signal = opts.signal
    return new Promise(() => {})
  } }), /timeout/)
  assert.equal(signal.aborted, true)
})
test('JSON body timeout also aborts transport', async () => {
  let signal
  await assert.rejects(loadHoldings('https://example.test', { timeoutMs: 10, fetchImpl: async (_, opts) => {
    signal = opts.signal
    return { ok: true, status: 200, json: () => new Promise(() => {}) }
  } }), /timeout/)
  assert.equal(signal.aborted, true)
})
test('lifecycle cancellation aborts a previous request', async () => {
  const lifecycle = new AbortController()
  let signal
  const result = loadHoldings('https://example.test', { timeoutMs: 100, signal: lifecycle.signal, fetchImpl: async (_, opts) => {
    signal = opts.signal
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))))
  } })
  lifecycle.abort()
  await assert.rejects(result)
  assert.equal(signal.aborted, true)
})
