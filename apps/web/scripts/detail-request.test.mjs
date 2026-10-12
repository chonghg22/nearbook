import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { DetailRequestError, requestDetail } from '../lib/detail-request.mjs'

const upstream = 'https://api.example.com/books/9791161571195'
const options = (response) => ({ fetchImpl: async () => response })

test('returns successful JSON and explicitly disables persistent caching', async () => {
  let seen
  const book = { isbn: '9791161571195', title: '불편한 편의점' }
  assert.deepEqual(await requestDetail(upstream, { fetchImpl: async (url, init) => {
    seen = { url, init }
    return Response.json(book)
  } }), book)
  assert.equal(seen.url, upstream)
  assert.equal(seen.init.cache, 'no-store')
  assert.ok(seen.init.signal instanceof AbortSignal)
})

test('only explicit HTTP 404 returns null, even for an HTML response', async () => {
  assert.equal(await requestDetail(upstream, options(new Response('<h1>missing</h1>', { status: 404 }))), null)
})

for (const status of [400, 401, 403, 429, 500, 502, 503, 504]) {
  test(`HTTP ${status} throws a typed error, not a missing detail`, async () => {
    await assert.rejects(requestDetail(upstream, options(new Response('SECRET body', { status }))),
      (error) => error instanceof DetailRequestError && error.kind === 'http' && error.status === status && !error.message.includes('SECRET'))
  })
}

test('invalid JSON is unavailable, not missing', async () => {
  await assert.rejects(requestDetail(upstream, options(new Response('<html>challenge</html>'))),
    { kind: 'invalid-response' })
})

test('HTTP 200 with JSON null is not treated as 404', async () => {
  await assert.rejects(requestDetail(upstream, options(Response.json(null))), { kind: 'invalid-response' })
})

test('network/TLS error is sanitized', async () => {
  await assert.rejects(requestDetail(upstream, { fetchImpl: async () => { throw new Error('SECRET TLS info') } }),
    (error) => error.kind === 'network' && !error.message.includes('SECRET'))
})

test('fetch timeout aborts the request even if fetch never resolves', async () => {
  let signal
  await assert.rejects(requestDetail(upstream, { timeoutMs: 10, fetchImpl: async (_, init) => {
    signal = init.signal
    return new Promise(() => {})
  } }), { kind: 'timeout' })
  assert.equal(signal.aborted, true)
})

test('timeout also bounds response body parsing', async () => {
  await assert.rejects(requestDetail(upstream, { timeoutMs: 10, fetchImpl: async () => ({
    ok: true, status: 200, json: () => new Promise(() => {}),
  }) }), { kind: 'timeout' })
})

test('a failed request does not poison the next successful read', async () => {
  let count = 0
  const fetchImpl = async () => ++count === 1 ? new Response('', { status: 503 }) : Response.json({ title: 'recovered' })
  await assert.rejects(requestDetail(upstream, { fetchImpl }), { kind: 'http' })
  assert.deepEqual(await requestDetail(upstream, { fetchImpl }), { title: 'recovered' })
})

test('book metadata is separate from holdings; default location still fetches on the client', async () => {
  const page = await readFile(new URL('../app/book/[isbn]/page.tsx', import.meta.url), 'utf8')
  const data = await readFile(new URL('../lib/detail-data.ts', import.meta.url), 'utf8')
  const client = await readFile(new URL('../app/book/[isbn]/_components/library-status.tsx', import.meta.url), 'utf8')
  assert.match(page, /fetchBookDetail\(isbn\)/)
  assert.doesNotMatch(page, /with-libraries|generateStaticParams|initialLibraries/)
  assert.doesNotMatch(data, /with-libraries|affiliates/)
  assert.match(client, /if \(!res.ok\) throw/)
  assert.match(client, /Array.isArray\(data\?\.libraries\)/)
  assert.doesNotMatch(client, /isDefaultLocation|initialLibraries/)
  assert.match(client, /controller.abort\(\)/)
  assert.match(client, /if \(!active\) return/)
  assert.match(client, /setRetryCount/)
})

test('both detail routes opt out of long-lived page caching and provide retry boundaries', async () => {
  for (const route of ['book/[isbn]', 'library/[id]']) {
    const page = await readFile(new URL(`../app/${route}/page.tsx`, import.meta.url), 'utf8')
    const boundary = await readFile(new URL(`../app/${route}/error.tsx`, import.meta.url), 'utf8')
    assert.match(page, /export const revalidate = 0/)
    assert.match(boundary, /DetailError/)
    assert.doesNotMatch(page, /if \(!res.ok\) return \{ title/)
  }
})

test('server detail retry forces a new document request, not a stale RSC error rerender', async () => {
  const errorUi = await readFile(new URL('../components/detail-error.tsx', import.meta.url), 'utf8')
  assert.match(errorUi, /window.location.reload\(\)/)
  assert.doesNotMatch(errorUi, /router.refresh|reset\(\)/)
})
