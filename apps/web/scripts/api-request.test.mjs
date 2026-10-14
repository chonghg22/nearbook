import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { ApiRequestError, requestApiJson, requestApiResponse } from '../lib/api-request.mjs'
import { DetailRequestError } from '../lib/detail-request.mjs'
import { MapLibrariesError } from '../lib/map-libraries.mjs'
const url = 'https://example.test/api?token=SECRET'

test('detail/map aliases share one typed error and request implementation', () => {
  assert.equal(DetailRequestError, ApiRequestError)
  assert.equal(MapLibrariesError, ApiRequestError)
})
test('merges caller options but always forces no-store and a bounded signal', async () => {
  let seen
  const data = await requestApiJson(url, { cache: 'force-cache', method: 'POST', body: '{}', headers: { 'X-Test': 'value' },
    fetchImpl: async (_, init) => { seen = init; return Response.json({ data: [] }) } })
  assert.deepEqual(data, { data: [] }); assert.equal(seen.cache, 'no-store')
  assert.equal(seen.method, 'POST'); assert.equal(seen.body, '{}'); assert.equal(seen.headers['X-Test'], 'value')
  assert.ok(seen.signal instanceof AbortSignal)
})
for (const status of [400, 401, 403, 404, 429, 500, 503]) {
  test(`HTTP ${status} is sanitized, typed and not a success/empty result`, async () => {
    let calls = 0
    await assert.rejects(requestApiJson(url, { fetchImpl: async () => { calls++; return new Response('SECRET body', { status }) } }),
      (e) => e instanceof ApiRequestError && e.kind === 'http' && e.status === status && !e.message.includes('SECRET'))
    assert.equal(calls, 1) // Never auto-retry mutations or quota failures.
  })
}
test('only explicitly opted-in detail 404 becomes null', async () => {
  assert.equal(await requestApiJson(url, { notFoundNull: true, fetchImpl: async () => new Response('', { status: 404 }) }), null)
  await assert.rejects(requestApiJson(url, { notFoundNull: true, fetchImpl: async () => new Response('', { status: 503 }) }), { kind: 'http', status: 503 })
})
for (const body of ['<html>challenge</html>', 'null', '']) {
  test('non-JSON/null/empty bodies are invalid response, never empty data', async () => {
    await assert.rejects(requestApiJson(url, { fetchImpl: async () => new Response(body) }), { kind: 'invalid-response' })
  })
}
test('body length and declared content length limits are enforced', async () => {
  for (const response of [new Response(JSON.stringify({ tooLong: '123456' })), new Response('{}', { headers: { 'Content-Length': '999999' } })]) {
    await assert.rejects(requestApiJson(url, { maxChars: 5, fetchImpl: async () => response }), { kind: 'invalid-response' })
  }
})
test('transport failure discards raw URL/token/exception details', async () => {
  await assert.rejects(requestApiJson(url, { fetchImpl: async () => { throw Error('SECRET internal URL') } }),
    (e) => e.kind === 'network' && !JSON.stringify(e).includes('SECRET') && !e.message.includes('SECRET'))
})
test('body-stream deadline aborts even if a body reader ignores cancellation', async () => {
  let signal
  await assert.rejects(requestApiJson(url, { timeoutMs: 10, fetchImpl: async (_, init) => {
    signal = init.signal
    return { ok: true, status: 200, text: () => new Promise(() => {}) }
  } }), { kind: 'timeout' })
  assert.equal(signal.aborted, true)
})
test('pre-aborted caller makes no request', async () => {
  const caller = new AbortController(); caller.abort(); let calls = 0
  await assert.rejects(requestApiJson(url, { signal: caller.signal, fetchImpl: async () => { calls++; return Response.json({}) } }), { kind: 'aborted' })
  assert.equal(calls, 0)
})
test('caller cancellation during JSON body read promptly rejects as aborted', async () => {
  const caller = new AbortController(); let start, signal
  const ready = new Promise((resolve) => { start = resolve })
  const result = requestApiJson(url, { signal: caller.signal, fetchImpl: async (_, init) => {
    signal = init.signal; return { ok: true, status: 200, text: () => { start(); return new Promise(() => {}) } }
  } })
  await ready; caller.abort(); await assert.rejects(result, { kind: 'aborted' }); assert.equal(signal.aborted, true)
})
test('response compatibility keeps status but never forwards sensitive error bodies', async () => {
  const out = await requestApiResponse(url, { fetchImpl: async () => new Response('SECRET', { status: 403 }) })
  assert.equal(out.status, 403); assert.deepEqual(await out.json(), { error: 'request_failed', statusCode: 403 })
})
test('auth Response body reads use the same deadline, preserving no-content success', async () => {
  assert.equal((await requestApiResponse(url, { fetchImpl: async () => new Response(null, { status: 204 }) })).status, 204)
  await assert.rejects(requestApiResponse(url, { timeoutMs: 10, fetchImpl: async () => ({ ok: true, status: 200, text: () => new Promise(() => {}) }) }), { kind: 'timeout' })
})
test('public search is wired to schemas and an explicit error/retry view', async () => {
  const source = await readFile(new URL('../app/search/_components/search-page-inner.tsx', import.meta.url), 'utf8')
  assert.match(source, /publicApiJson\(path, parseSearchResult/); assert.match(source, /const resultError = error \|\|/)
  assert.match(source, /error=\{resultError\}/)
  assert.match(source, /keepPreviousData: false/); assert.match(source, /shouldRetryOnError: false/)
  assert.match(source, /mutate\(\)/); assert.doesNotMatch(source, /import.*apiFetch|supabase|getSession|getUser/)
})
