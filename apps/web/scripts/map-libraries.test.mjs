import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  MapLibrariesError, SEOUL_DEFAULT_BOUNDS, computeRegionCenter, createLatestRequest, escapeHtml, fetchJson,
  parseBoundsParams, parseLibraryList, parseLimit, parseRegionParams, parseRegionResponse, proxyError,
  requestLibraries, resolveLibraryQuery, resolveRegionCenter, runCleanup, teardownNaverMap,
} from '../lib/map-libraries.mjs'

const lib = { id: 1, name: '해운대도서관', address: '부산광역시 해운대구', lat: 35.16, lng: 129.16 }
const center = { lat: 35.16, lng: 129.16, zoom: 13 }
const isKind = (kind) => (error) => error instanceof MapLibrariesError && error.kind === kind

test('valid list is normalized and a valid empty list stays empty', () => {
  assert.deepEqual(parseLibraryList({ data: [lib, { id: 2, name: ' 반여 ', lat: 35.2, lng: 129.1 }] }),
    [lib, { id: 2, name: '반여', address: '', lat: 35.2, lng: 129.1 }])
  assert.deepEqual(parseLibraryList({ data: [] }), [])
})

for (const [label, row] of [
  ['null lat', { ...lib, lat: null }],
  ['empty-string lat', { ...lib, lat: '' }],
  ['numeric-string lng', { ...lib, lng: '129.1' }],
  ['out-of-range lat', { ...lib, lat: 91 }],
  ['out-of-range lng', { ...lib, lng: -181 }],
  ['NaN lng', { ...lib, lng: NaN }],
  ['missing id', { ...lib, id: undefined }],
  ['string id', { ...lib, id: '1' }],
  ['blank name', { ...lib, name: ' ' }],
  ['non-string address', { ...lib, address: 3 }],
  ['null row', null],
]) {
  test(`non-empty list with ${label} is invalid-response, never []`, () => {
    assert.throws(() => parseLibraryList({ data: [lib, row] }), isKind('invalid-response'))
    assert.throws(() => parseLibraryList({ data: [row] }), isKind('invalid-response'))
  })
}

for (const json of [null, [], {}, { data: null }, { data: {} }, 'x', { data: Array(201).fill(lib) }]) {
  test(`list envelope ${JSON.stringify(json).slice(0, 30)} is invalid-response`, () => {
    assert.throws(() => parseLibraryList(json), isKind('invalid-response'))
  })
}

test('region response requires a valid center for a non-empty region', () => {
  assert.deepEqual(parseRegionResponse({ data: [lib], center, limited: false }), { libraries: [lib], center, limited: false })
  for (const bad of [null, undefined, {}, { lat: 35, lng: 129 }, { ...center, lat: null }, { ...center, lat: '' },
    { ...center, lat: '35' }, { ...center, lng: 200 }, { ...center, zoom: 0 }]) {
    assert.throws(() => parseRegionResponse({ data: [lib], center: bad, limited: false }), isKind('invalid-response'))
  }
})

test('valid empty region has a null center; other shapes are invalid', () => {
  assert.deepEqual(parseRegionResponse({ data: [], center: null, limited: false }), { libraries: [], center: null, limited: false })
  assert.throws(() => parseRegionResponse({ data: [], limited: false }), isKind('invalid-response'))
  assert.throws(() => parseRegionResponse({ data: [], center, limited: false }), isKind('invalid-response'))
  assert.throws(() => parseRegionResponse({ data: [lib], center, limited: 'no' }), isKind('invalid-response'))
  assert.throws(() => parseRegionResponse({ center: null, limited: false }), isKind('invalid-response'))
})

test('region center averages coordinates and is null without libraries', () => {
  assert.deepEqual(computeRegionCenter([{ ...lib, lat: 35, lng: 129 }, { ...lib, id: 2, lat: 35.5, lng: 129.5 }], '해운대구'),
    { lat: 35.25, lng: 129.25, zoom: 13 })
  assert.equal(computeRegionCenter([], '해운대구'), null)
  assert.equal(computeRegionCenter([lib])?.zoom, 11)
})

test('district without a current center falls back to its province, never a previous district', () => {
  const province = { lat: 35.1796, lng: 129.0756, zoom: 12 }
  // 지역 미선택: 지도 bounds 정책을 유지한다.
  assert.equal(resolveRegionCenter({ sido: '', provinceCenter: province, responseCenter: center }), undefined)
  assert.deepEqual(resolveRegionCenter({ sido: '부산광역시', provinceCenter: province, responseCenter: null }), province)
  assert.deepEqual(resolveRegionCenter({ sido: '부산광역시', sigungu: '해운대구', provinceCenter: province, responseCenter: center }), center)
  // 로딩·실패·빈 결과는 모두 현재 시군구 center가 null이다.
  assert.deepEqual(resolveRegionCenter({ sido: '부산광역시', sigungu: '기장군', provinceCenter: province, responseCenter: null }), province)
})

test('bounds params are parsed strictly', () => {
  assert.deepEqual(parseBoundsParams(new URLSearchParams('swLat=37.4&swLng=126.8&neLat=37.6&neLng=127.1')),
    { swLat: 37.4, swLng: 126.8, neLat: 37.6, neLng: 127.1 })
  for (const query of [
    'swLat=37&swLng=126&neLat=38',
    'swLat=&swLng=126&neLat=38&neLng=127',
    'swLat=1e1&swLng=126&neLat=38&neLng=127',
    'swLat=abc&swLng=126&neLat=38&neLng=127',
    'swLat=-91&swLng=126&neLat=38&neLng=127',
    'swLat=37&swLng=181&neLat=38&neLng=182',
    'swLat=38&swLng=126&neLat=37&neLng=127',
    'swLat=37&swLng=128&neLat=38&neLng=127',
    'swLat=37%26x%3D1&swLng=126&neLat=38&neLng=127',
  ]) {
    assert.equal(parseBoundsParams(new URLSearchParams(query)), null, query)
  }
})

test('limit defaults to 100 and is capped at the upstream maximum', () => {
  assert.equal(parseLimit(null), 100)
  assert.equal(parseLimit('50'), 50)
  for (const raw of ['', '0', '201', '1000', 'abc', '1.5', '-1']) assert.equal(parseLimit(raw), null, raw)
})

test('region params require a province and reject wildcards', () => {
  assert.deepEqual(parseRegionParams(' 부산광역시 ', '해운대구'), { sido: '부산광역시', sigungu: '해운대구' })
  assert.deepEqual(parseRegionParams('세종특별자치시', null), { sido: '세종특별자치시', sigungu: '' })
  for (const [sido, sigungu] of [[null, null], ['', '해운대구'], ['부산%', null], ['부산광역시', '해운대_'], ['a'.repeat(21), null], ['부산\n', '<b>']]) {
    assert.equal(parseRegionParams(sido, sigungu), null, String(sido))
  }
})

const url = 'https://upstream.example/libraries/in-bounds?swLat=37'

for (const status of [400, 403, 429, 500, 502, 503]) {
  test(`HTTP ${status} is a typed http error without the body`, async () => {
    await assert.rejects(fetchJson(url, { fetchImpl: async () => new Response('SECRET body', { status }) }),
      (error) => isKind('http')(error) && error.status === status && !error.message.includes('SECRET'))
  })
}

test('invalid JSON and oversized bodies are invalid-response', async () => {
  await assert.rejects(fetchJson(url, { fetchImpl: async () => new Response('<html>challenge</html>') }), isKind('invalid-response'))
  await assert.rejects(fetchJson(url, { maxChars: 10, fetchImpl: async () => new Response(JSON.stringify({ data: 'x'.repeat(20) })) }),
    isKind('invalid-response'))
  await assert.rejects(fetchJson(url, { maxChars: 10, fetchImpl: async () => new Response('{}', { headers: { 'content-length': '11' } }) }),
    isKind('invalid-response'))
})

test('network errors are sanitized', async () => {
  await assert.rejects(fetchJson(url, { fetchImpl: async () => { throw new Error('SECRET TLS info') } }),
    (error) => isKind('network')(error) && !error.message.includes('SECRET'))
})

test('timeout aborts a hanging fetch', async () => {
  let signal
  await assert.rejects(fetchJson(url, { timeoutMs: 10, fetchImpl: async (_, init) => {
    signal = init.signal
    return new Promise(() => {})
  } }), isKind('timeout'))
  assert.equal(signal.aborted, true)
})

test('timeout also bounds body reading', async () => {
  await assert.rejects(fetchJson(url, { timeoutMs: 10, fetchImpl: async () => ({
    ok: true, status: 200, text: () => new Promise(() => {}),
  }) }), isKind('timeout'))
})

test('caller abort is reported as aborted, not as a failure or empty list', async () => {
  const controller = new AbortController()
  const pending = fetchJson(url, { signal: controller.signal, fetchImpl: () => new Promise(() => {}) })
  controller.abort()
  await assert.rejects(pending, isKind('aborted'))
  await assert.rejects(fetchJson(url, { signal: controller.signal, fetchImpl: async () => Response.json({ data: [] }) }), isKind('aborted'))
})

test('proxy errors map to fixed sanitized responses', () => {
  assert.deepEqual(proxyError(new MapLibrariesError('http', 429)), { status: 429, body: { error: 'upstream_unavailable', kind: 'http' } })
  assert.equal(proxyError(new MapLibrariesError('http', 503)).status, 502)
  assert.equal(proxyError(new MapLibrariesError('http', 403)).status, 502)
  assert.equal(proxyError(new MapLibrariesError('timeout')).status, 504)
  assert.equal(proxyError(new MapLibrariesError('invalid-response')).status, 502)
  const generic = proxyError(new Error('SECRET https://user:token@internal.example'))
  assert.equal(generic.status, 502)
  assert.doesNotMatch(JSON.stringify(generic), /SECRET|token|internal/)
})

const mapBounds = { swLat: 37.4, swLng: 126.8, neLat: 37.6, neLng: 127.1 }

test('selected region takes priority over map bounds', () => {
  const query = resolveLibraryQuery({ bounds: mapBounds, sido: '부산광역시', sigungu: '해운대구' })
  assert.equal(query.type, 'region')
  assert.equal(query.url, `/api/libraries/by-region?${new URLSearchParams({ sido: '부산광역시', sigungu: '해운대구' })}`)
  // 지도 이동(bounds 변경)은 지역 조회 키를 바꾸지 않는다.
  assert.equal(resolveLibraryQuery({ bounds: SEOUL_DEFAULT_BOUNDS, sido: '부산광역시', sigungu: '해운대구' }).key, query.key)
})

test('changing province or district changes the region key and scope', () => {
  const seoul = resolveLibraryQuery({ sido: '서울특별시' })
  const busan = resolveLibraryQuery({ sido: '부산광역시' })
  const haeundae = resolveLibraryQuery({ sido: '부산광역시', sigungu: '해운대구' })
  assert.equal(new Set([seoul.key, busan.key, haeundae.key]).size, 3)
  assert.equal(new Set([seoul.scope, busan.scope, haeundae.scope]).size, 3)
  assert.equal(busan.url, `/api/libraries/by-region?${new URLSearchParams({ sido: '부산광역시' })}`)
})

test('whole province falls back to map bounds, or the Seoul area without a map', () => {
  const byMap = resolveLibraryQuery({ bounds: mapBounds, sido: '', sigungu: '해운대구' })
  assert.equal(byMap.type, 'bounds')
  assert.equal(byMap.url, '/api/libraries/in-bounds?swLat=37.4&swLng=126.8&neLat=37.6&neLng=127.1')
  assert.ok(byMap.debounceMs > 0)
  const noMap = resolveLibraryQuery({ bounds: null })
  assert.ok(noMap.url.includes(`swLat=${SEOUL_DEFAULT_BOUNDS.swLat}`))
  assert.equal(noMap.scope, byMap.scope)
})

test('late region A cannot win once region B started, and unmount cancels B', async () => {
  const latest = createLatestRequest()
  const a = latest.begin()
  const pendingA = requestLibraries(resolveLibraryQuery({ sido: '서울특별시' }), { signal: a.signal, fetchImpl: () => new Promise(() => {}) })
  const b = latest.begin()
  assert.equal(a.isCurrent(), false)
  assert.equal(a.signal.aborted, true)
  assert.equal(b.isCurrent(), true)
  await assert.rejects(pendingA, isKind('aborted'))
  latest.cancel()
  assert.equal(b.isCurrent(), false)
  assert.equal(b.signal.aborted, true)
})

test('region request: data, valid empty, error and retry recovery are distinct', async () => {
  const query = resolveLibraryQuery({ sido: '부산광역시', sigungu: '해운대구' })
  let seen
  const ok = await requestLibraries(query, { fetchImpl: async (u) => {
    seen = u
    return Response.json({ data: [lib], center, limited: false })
  } })
  assert.equal(seen, query.url)
  assert.deepEqual(ok, { libraries: [lib], center, limited: false })
  assert.deepEqual(await requestLibraries(query, { fetchImpl: async () => Response.json({ data: [], center: null, limited: false }) }),
    { libraries: [], center: null, limited: false })
  let count = 0
  const flaky = async () => (++count === 1 ? new Response('', { status: 503 }) : Response.json({ data: [lib], center, limited: true }))
  await assert.rejects(requestLibraries(query, { fetchImpl: flaky }), isKind('http'))
  assert.equal((await requestLibraries(query, { fetchImpl: flaky })).limited, true)
})

test('bounds request validates rows and has no center', async () => {
  const query = resolveLibraryQuery({ bounds: mapBounds })
  assert.deepEqual(await requestLibraries(query, { fetchImpl: async () => Response.json({ data: [lib] }) }),
    { libraries: [lib], center: null, limited: false })
  await assert.rejects(requestLibraries(query, { fetchImpl: async () => Response.json({ data: [{ ...lib, lat: null }] }) }),
    isKind('invalid-response'))
})

test('marker info window escapes library names', () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert('1')">&`), '&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;')
})

const hostileMaps = { Event: { removeListener() { throw new TypeError("Cannot read properties of null (reading 'isArray')") } } }

test('cleanup runs every action even when SDK cleanup throws, and never throws', () => {
  const ran = []
  let failed
  assert.doesNotThrow(() => {
    failed = runCleanup(
      () => { throw new TypeError("Cannot read properties of null (reading 'KVO')") },
      () => ran.push('marker'),
      null,
      undefined,
      () => hostileMaps.Event.removeListener({}),
      () => ran.push('after'),
    )
  })
  assert.equal(failed, 2)
  assert.deepEqual(ran, ['marker', 'after'])
})

test('map teardown tolerates a nulled or hostile SDK and still destroys the map', () => {
  let destroyed = 0
  const map = { destroy() { destroyed += 1 } }
  assert.equal(teardownNaverMap({ map, listeners: [{}], getMaps: () => null }), 0)
  assert.equal(teardownNaverMap({ map, listeners: [{}], getMaps: () => ({ Event: null }) }), 0)
  assert.equal(teardownNaverMap({ map, listeners: [{}, {}], getMaps: () => hostileMaps }), 2)
  assert.equal(teardownNaverMap({ map, listeners: [{}], getMaps: () => { throw new TypeError("reading 'Event'") } }), 1)
  assert.equal(destroyed, 4)
  const brokenMap = { destroy() { throw new TypeError('null') } }
  assert.equal(teardownNaverMap({ map: brokenMap, listeners: [null], getMaps: () => hostileMaps }), 1)
  assert.equal(teardownNaverMap({ map: null, listeners: [null] }), 0)
})

test('failure state and parent notification survive a throwing teardown (hook order)', () => {
  const calls = []
  const refs = { map: { destroy() { throw new TypeError('null') } }, listener: {} }
  const fail = (message) => {
    calls.push(['error', message])
    const { map, listener } = refs
    refs.map = null
    refs.listener = null
    teardownNaverMap({ map, listeners: [listener], getMaps: () => hostileMaps })
    calls.push(['torn-down'])
  }
  assert.doesNotThrow(() => fail('지도 인증 실패'))
  assert.deepEqual(calls, [['error', '지도 인증 실패'], ['torn-down']])
  assert.deepEqual(refs, { map: null, listener: null })
})

test('static wiring guards (supplement, not a replacement for browser verification)', async () => {
  const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')
  const view = await read('app/libraries/_components/libraries-map-view.tsx')
  const hook = await read('hooks/use-map-libraries.ts')
  const naver = await read('hooks/use-naver-map.ts')
  const map = await read('components/maps/naver-interactive-map.tsx')
  assert.match(view, /useMapLibraries\(bounds, region\)/)
  assert.match(view, /onClick=\{retry\}/)
  assert.match(view, /목록 보기/)
  assert.doesNotMatch(view, /region-center/)
  assert.match(view, /resolveRegionCenter\(/)
  assert.doesNotMatch(view, /window\.innerWidth/)
  assert.match(view, /absolute inset-x-3 top-3 z-20/)
  assert.doesNotMatch(view, /inset-x-3 bottom-3/)
  assert.match(hook, /request\.isCurrent\(\)/)
  assert.match(hook, /latest\.cancel\(\)/)
  assert.doesNotMatch(naver, /SEOUL_DEFAULT_BOUNDS|console\.log/)
  assert.match(naver, /SDK_TIMEOUT_MS/)
  assert.match(naver, /teardownNaverMap\(\{ map, listeners: \[listener\]/)
  assert.doesNotMatch(naver, /naver\?\.maps\.Event/)
  assert.match(naver, /setError\(message\)\n\s+setIsLoaded\(false\)\n[^\n]*\n\s+teardownMap\(\)/)
  assert.match(naver, /setError\(null\)/)
  assert.match(naver, /navermap_authFailure === onAuthFailure/)
  assert.match(map, /escapeHtml\(lib\.name\)/)
  assert.doesNotMatch(map, /\$\{lib\.name\}/)
  assert.match(map, /runCleanup\(\(\) => infoWindowRef\.current\?\.close\(\)\)\n\s+\}, \[libraries, map\]/)
  assert.doesNotMatch(map, /return \(\) => maps\.Event\.removeListener/)
  assert.doesNotMatch(map, /listeners\.forEach\(\(listener\) => maps\.Event\.removeListener/)
})
