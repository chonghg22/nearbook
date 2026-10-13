import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  MapLibrariesError, SEOUL_DEFAULT_BOUNDS, computeRegionCenter, createLatestRequest, createMapResizer, createMarkerLayer,
  escapeHtml, fetchJson, libraryPopupHtml, observeElementSize, parseBoundsParams, parseLibraryList, parseLimit,
  parseRegionParams, parseRegionResponse, proxyError, requestLibraries, resolveLibraryQuery, resolveRegionCenter,
  runCleanup, teardownNaverMap,
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
  // InfoWindow HTML은 libraryPopupHtml(아래 동작 테스트)로만 만든다.
  assert.doesNotMatch(map, /\$\{lib(rary)?\.name\}|escapeHtml/)
  assert.match(map, /createMarkerLayer<MarkerHandle>\(/)
  assert.match(map, /\.sync\(libraries, selectedLibraryId, scopeKey\)/)
  // 목록 갱신마다 InfoWindow를 닫던 정리 effect가 돌아오지 않게 한다.
  assert.doesNotMatch(map, /\}, \[libraries, map\]\)/)
  assert.doesNotMatch(map, /return \(\) => maps\.Event\.removeListener/)
  assert.doesNotMatch(map, /listeners\.forEach\(\(listener\) => maps\.Event\.removeListener/)
  assert.match(view, /scopeKey=\{scope\}/)
  assert.match(naver, /observeElementSize\(\{/)
  assert.match(naver, /isCurrent: \(\) => active && mapRef\.current === map/)
})

test('InfoWindow HTML escapes the name and links the encoded detail path', () => {
  const html = libraryPopupHtml({ id: 111492, name: `<img src=x onerror="alert('1')">&`, lat: 37.6, lng: 127 })
  assert.ok(html.includes('&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;'))
  assert.doesNotMatch(html, /<img|onerror="/)
  assert.ok(html.includes('href="/library/111492"'))
})

const edge = { id: 111492, name: '성북길빛도서관', lat: 37.6, lng: 127.02 }
const near = { id: 2, name: '정릉도서관', lat: 37.61, lng: 127.0 }
const copy = (list) => list.map((library) => ({ ...library }))

function fakeMarkerSdk() {
  const sdk = { hostile: false, failIds: new Set(), log: [], handles: new Map(), popup: { open: false, html: '', id: null } }
  const sdkThrow = () => {
    if (sdk.hostile) throw new TypeError("Cannot read properties of null (reading 'KVO')")
  }
  sdk.adapter = {
    createMarker(library, selected, open) {
      sdkThrow()
      if (sdk.failIds.has(library.id)) throw new Error('marker failed')
      const handle = { id: library.id, selected, lat: library.lat, lng: library.lng, removed: false, click: open }
      sdk.handles.set(library.id, handle)
      sdk.log.push(['create', library.id, selected])
      return handle
    },
    setPosition(handle, library) {
      sdk.log.push(['move', handle.id])
      sdkThrow()
      handle.lat = library.lat
      handle.lng = library.lng
    },
    setSelected(handle, selected) {
      sdk.log.push(['select', handle.id, selected])
      sdkThrow()
      handle.selected = selected
    },
    removeMarker(handle) {
      sdk.log.push(['remove', handle.id])
      handle.removed = true
      sdkThrow()
    },
    openPopup(handle, html) {
      sdk.log.push(['open', handle.id])
      sdkThrow()
      Object.assign(sdk.popup, { open: true, html, id: handle.id })
    },
    updatePopup(handle, html, moved) {
      sdk.log.push(['update-popup', handle.id, moved])
      sdkThrow()
      sdk.popup.html = html
    },
    closePopup() {
      sdk.log.push(['close'])
      sdk.popup.open = false
      sdkThrow()
    },
  }
  return sdk
}

test('edge marker InfoWindow survives the auto-pan bounds refresh; markers keep their identity', () => {
  const sdk = fakeMarkerSdk()
  const layer = createMarkerLayer(sdk.adapter)
  const list = [edge, near]
  layer.sync(list, null, 'bounds')
  assert.deepEqual(sdk.log, [['create', edge.id, false], ['create', near.id, false]])
  const edgeMarker = sdk.handles.get(edge.id)
  edgeMarker.click()
  assert.equal(layer.openId(), edge.id)
  assert.equal(sdk.popup.open, true)
  assert.equal(sdk.popup.html, libraryPopupHtml(edge))
  sdk.log.length = 0
  // 같은 범위 로딩 중에는 같은 배열이 다시 전달된다.
  layer.sync(list, null, 'bounds')
  assert.deepEqual(sdk.log, [])
  // 자동 이동 → idle → bounds 재조회 응답: 같은 id의 새 객체와 새 도서관.
  const added = { id: 3, name: '새 도서관', lat: 37.62, lng: 127.03 }
  layer.sync([...copy(list), added], null, 'bounds')
  assert.deepEqual(sdk.log, [['create', added.id, false]])
  assert.equal(sdk.handles.get(edge.id), edgeMarker)
  assert.equal(edgeMarker.removed, false)
  assert.equal(sdk.popup.open, true)
  assert.equal(layer.openId(), edge.id)
  assert.deepEqual(layer.ids().sort((a, b) => a - b), [2, 3, 111492])
})

test('selection changes update only the affected icons, without recreating markers or closing the popup', () => {
  const sdk = fakeMarkerSdk()
  const layer = createMarkerLayer(sdk.adapter)
  layer.sync([edge, near], null, 'bounds')
  layer.open(edge.id)
  sdk.log.length = 0
  layer.sync([edge, near], near.id, 'bounds')
  assert.deepEqual(sdk.log, [['select', near.id, true]])
  sdk.log.length = 0
  layer.sync(copy([edge, near]), edge.id, 'bounds')
  assert.deepEqual(sdk.log, [['select', edge.id, true], ['select', near.id, false]])
  sdk.log.length = 0
  const added = { id: 3, name: '새 도서관', lat: 37.62, lng: 127.03 }
  layer.sync([edge, near, added], added.id, 'bounds')
  assert.deepEqual(sdk.log, [['select', edge.id, false], ['create', added.id, true]])
  assert.equal(sdk.handles.get(edge.id).selected, false)
  assert.equal(sdk.popup.open, true)
  assert.equal(layer.openId(), edge.id)
})

test('refreshed data updates the open InfoWindow safely and only when it changed', () => {
  const sdk = fakeMarkerSdk()
  const layer = createMarkerLayer(sdk.adapter)
  layer.sync([edge, near], null, 'bounds')
  assert.equal(layer.open(near.id), true)
  sdk.log.length = 0
  layer.sync(copy([edge, near]), null, 'bounds')
  assert.deepEqual(sdk.log, [])
  const renamed = { ...near, name: '<img src=x onerror=alert(1)>정릉' }
  layer.sync([edge, renamed], null, 'bounds')
  assert.deepEqual(sdk.log, [['update-popup', near.id, false]])
  assert.ok(sdk.popup.html.includes('&lt;img src=x onerror=alert(1)&gt;정릉'))
  assert.doesNotMatch(sdk.popup.html, /<img/)
  sdk.log.length = 0
  layer.sync([edge, { ...renamed, lat: 37.615 }], null, 'bounds')
  assert.deepEqual(sdk.log, [['move', near.id], ['update-popup', near.id, true]])
  // 열리지 않은 도서관의 이름 변경은 InfoWindow를 건드리지 않는다.
  sdk.log.length = 0
  layer.sync([{ ...edge, name: '성북 길빛' }, { ...renamed, lat: 37.615 }], null, 'bounds')
  assert.deepEqual(sdk.log, [])
  assert.equal(layer.openId(), near.id)
})

test('the InfoWindow closes only when its own library leaves the settled list', () => {
  const sdk = fakeMarkerSdk()
  const layer = createMarkerLayer(sdk.adapter)
  layer.sync([edge, near], null, 'bounds')
  layer.open(edge.id)
  sdk.log.length = 0
  layer.sync([edge], null, 'bounds')
  assert.deepEqual(sdk.log, [['remove', near.id]])
  assert.equal(layer.openId(), edge.id)
  sdk.log.length = 0
  // 요청 실패로 확정된 빈 목록
  layer.sync([], null, 'bounds')
  assert.deepEqual(sdk.log, [['close'], ['remove', edge.id]])
  assert.equal(layer.openId(), null)
  assert.equal(sdk.popup.open, false)
})

test('a region scope change closes the InfoWindow even if the library is still listed', () => {
  const sdk = fakeMarkerSdk()
  const layer = createMarkerLayer(sdk.adapter)
  const seoul = resolveLibraryQuery({ sido: '서울특별시' }).scope
  const busan = resolveLibraryQuery({ sido: '부산광역시' }).scope
  layer.sync([edge, near], null, 'bounds')
  layer.open(edge.id)
  sdk.log.length = 0
  layer.sync([edge, near], null, seoul)
  assert.deepEqual(sdk.log, [['close']])
  assert.equal(layer.openId(), null)
  // 실제 지역 변경은 빈 목록과 함께 온다: 이전 지역 마커를 모두 지운다.
  sdk.log.length = 0
  layer.sync([], null, busan)
  assert.deepEqual(sdk.log.map(([op]) => op), ['remove', 'remove'])
  assert.deepEqual(layer.ids(), [])
})

test('map click closes once; unknown ids and duplicate rows are harmless', () => {
  const sdk = fakeMarkerSdk()
  const layer = createMarkerLayer(sdk.adapter)
  layer.sync([edge, { ...edge, name: '중복' }, near], null, 'bounds')
  assert.deepEqual(layer.ids(), [edge.id, near.id])
  assert.equal(layer.open(999), false)
  assert.equal(layer.open(edge.id), true)
  assert.equal(sdk.popup.html, libraryPopupHtml(edge))
  sdk.log.length = 0
  layer.close()
  layer.close()
  assert.deepEqual(sdk.log, [['close']])
  assert.equal(layer.openId(), null)
})

test('a failed marker is reported, does not block others, and is retried; a throwing SDK never escapes', () => {
  const sdk = fakeMarkerSdk()
  const errors = []
  const layer = createMarkerLayer(sdk.adapter, { onCreateError: (id, error) => errors.push([id, error.message]) })
  sdk.failIds.add(near.id)
  layer.sync([edge, near], null, 'bounds')
  assert.deepEqual(layer.ids(), [edge.id])
  assert.deepEqual(errors, [[near.id, 'marker failed']])
  sdk.failIds.clear()
  layer.sync(copy([edge, near]), null, 'bounds')
  assert.deepEqual(layer.ids(), [edge.id, near.id])
  sdk.hostile = true
  assert.doesNotThrow(() => layer.sync([{ ...edge, lat: 37.7 }, near], edge.id, 'bounds'))
  // SDK가 열기 중 던지면 열린 상태로 기록하지 않는다.
  assert.equal(layer.open(edge.id), false)
  assert.equal(layer.openId(), null)
})

test('teardown closes the InfoWindow and removes every marker even with a nulled SDK; later calls are no-ops', () => {
  const sdk = fakeMarkerSdk()
  const layer = createMarkerLayer(sdk.adapter)
  layer.sync([edge, near], null, 'bounds')
  layer.open(edge.id)
  sdk.hostile = true
  assert.doesNotThrow(() => layer.destroy())
  assert.equal(sdk.handles.get(edge.id).removed, true)
  assert.equal(sdk.handles.get(near.id).removed, true)
  assert.equal(sdk.popup.open, false)
  assert.equal(layer.openId(), null)
  assert.deepEqual(layer.ids(), [])
  sdk.hostile = false
  sdk.log.length = 0
  // 정리 뒤 늦은 마커 클릭·목록 갱신은 아무것도 하지 않는다.
  assert.equal(sdk.handles.get(edge.id).click(), false)
  layer.sync([edge], null, 'bounds')
  layer.destroy()
  assert.deepEqual(sdk.log, [])
})

class FakeSize {
  constructor(width, height) {
    this.width = width
    this.height = height
  }
}
const sizedMaps = { Size: FakeSize }

function fakeSizedMap(onSetSize) {
  return {
    calls: [],
    center: { lat: 37.5665, lng: 126.978 },
    getCenter() {
      return this.center
    },
    setSize(size) {
      assert.ok(size instanceof FakeSize)
      this.calls.push(['setSize', size.width, size.height])
      onSetSize?.(size)
    },
    setCenter(center) {
      this.calls.push(['setCenter', center])
    },
  }
}

test('cached SDK: a map created in the narrow split column grows to the full mobile width once, keeping its center', () => {
  const map = fakeSizedMap()
  let notified = 0
  const resize = createMapResizer({
    map, getMaps: () => sizedMaps, isCurrent: () => true, initial: { width: 70, height: 700 }, onResize: () => notified++,
  })
  // 관찰 시작 직후의 같은 크기
  assert.equal(resize({ width: 70, height: 700 }), false)
  // 부모 effect가 모바일에서 분할 → 지도 단독으로 전환
  assert.equal(resize({ width: 390, height: 700 }), true)
  assert.deepEqual(map.calls, [['setSize', 390, 700], ['setCenter', map.center]])
  assert.equal(notified, 1)
  assert.equal(resize({ width: 390.4, height: 700 }), false)
  assert.equal(notified, 1)
})

test('zero, negative and non-finite sizes are ignored; a map created at 0×0 is fixed on the first real size', () => {
  const map = fakeSizedMap()
  const resize = createMapResizer({ map, getMaps: () => sizedMaps, isCurrent: () => true, onResize: () => {} })
  for (const size of [{ width: 0, height: 700 }, { width: 390, height: 0 }, { width: -1, height: 700 },
    { width: NaN, height: 700 }, { width: Infinity, height: 700 }]) {
    assert.equal(resize(size), false, JSON.stringify(size))
  }
  assert.deepEqual(map.calls, [])
  const zero = createMapResizer({ map, getMaps: () => sizedMaps, isCurrent: () => true, initial: { width: 0, height: 0 }, onResize: () => {} })
  assert.equal(zero({ width: 390, height: 700 }), true)
})

test('synchronous idle during setSize cannot re-enter or loop', () => {
  const reentered = []
  let notified = 0
  let resize
  const map = fakeSizedMap(() => reentered.push(resize({ width: 500, height: 500 })))
  resize = createMapResizer({
    map,
    getMaps: () => sizedMaps,
    isCurrent: () => true,
    onResize: () => {
      notified += 1
      // bounds 알림이 같은 크기로 다시 들어와도 중복 적용하지 않는다.
      resize({ width: 390, height: 700 })
    },
  })
  assert.equal(resize({ width: 390, height: 700 }), true)
  assert.deepEqual(reentered, [false])
  assert.equal(notified, 1)
  assert.equal(map.calls.filter(([op]) => op === 'setSize').length, 1)
})

test('a torn-down or replaced map is never resized or reported', () => {
  let current = false
  let notified = 0
  const map = fakeSizedMap()
  const stale = createMapResizer({ map, getMaps: () => sizedMaps, isCurrent: () => current, onResize: () => notified++ })
  assert.equal(stale({ width: 390, height: 700 }), false)
  assert.deepEqual(map.calls, [])
  // setSize 중 인증 실패로 지도가 정리되면 bounds를 알리지 않는다.
  current = true
  const failing = fakeSizedMap(() => { current = false })
  const resize = createMapResizer({ map: failing, getMaps: () => sizedMaps, isCurrent: () => current, onResize: () => notified++ })
  assert.equal(resize({ width: 390, height: 700 }), false)
  // 정리된 지도에는 setCenter도 호출하지 않는다.
  assert.deepEqual(failing.calls, [['setSize', 390, 700]])
  assert.equal(notified, 0)
})

test('a nulled or throwing SDK never throws; the size is applied once the SDK works', () => {
  let maps = null
  let notified = 0
  const map = fakeSizedMap()
  const resize = createMapResizer({ map, getMaps: () => maps, isCurrent: () => true, onResize: () => notified++ })
  assert.equal(resize({ width: 390, height: 700 }), false)
  const throwingGetter = createMapResizer({
    map, getMaps: () => { throw new TypeError("reading 'maps'") }, isCurrent: () => true, onResize: () => notified++,
  })
  assert.doesNotThrow(() => assert.equal(throwingGetter({ width: 390, height: 700 }), false))
  const broken = fakeSizedMap()
  broken.setSize = () => { throw new TypeError("Cannot read properties of null (reading 'KVO')") }
  const brokenResize = createMapResizer({ map: broken, getMaps: () => sizedMaps, isCurrent: () => true, onResize: () => notified++ })
  assert.doesNotThrow(() => assert.equal(brokenResize({ width: 390, height: 700 }), false))
  assert.equal(notified, 0)
  // 실패한 시도는 같은 크기 중복 판정에 쓰이지 않는다.
  maps = sizedMaps
  assert.equal(resize({ width: 390, height: 700 }), true)
  assert.equal(notified, 1)
  const noCenter = fakeSizedMap()
  noCenter.getCenter = () => { throw new TypeError('null') }
  assert.equal(createMapResizer({ map: noCenter, getMaps: () => sizedMaps, isCurrent: () => true, onResize: () => {} })({ width: 390, height: 700 }), true)
  assert.deepEqual(noCenter.calls, [['setSize', 390, 700]])
})

function fakeResizeObserverClass() {
  const instances = []
  class FakeResizeObserver {
    constructor(callback) {
      this.callback = callback
      this.observed = []
      this.disconnected = 0
      instances.push(this)
    }
    observe(element) {
      this.observed.push(element)
    }
    disconnect() {
      this.disconnected += 1
    }
    emit(...sizes) {
      this.callback(sizes.map(([width, height]) => ({ contentRect: { width, height } })), this)
    }
  }
  return { FakeResizeObserver, instances }
}

test('container observer forwards the latest size and drops deliveries after disconnect', () => {
  const { FakeResizeObserver, instances } = fakeResizeObserverClass()
  const element = { id: 'map' }
  const seen = []
  const stop = observeElementSize({ element, onSize: (size) => seen.push(size), ResizeObserverImpl: FakeResizeObserver })
  const [observer] = instances
  assert.deepEqual(observer.observed, [element])
  observer.emit([70, 700], [390, 700])
  observer.emit()
  assert.deepEqual(seen, [{ width: 390, height: 700 }])
  stop()
  stop()
  assert.equal(observer.disconnected, 1)
  observer.emit([500, 700])
  assert.equal(seen.length, 1)
})

test('container observer never throws: missing API, failing constructor/observe/disconnect, throwing consumer', () => {
  assert.doesNotThrow(() => observeElementSize({ element: {}, onSize: () => {}, ResizeObserverImpl: undefined })())
  class ThrowingConstructor {
    constructor() {
      throw new Error('ctor')
    }
  }
  assert.doesNotThrow(() => observeElementSize({ element: {}, onSize: () => {}, ResizeObserverImpl: ThrowingConstructor })())
  const { FakeResizeObserver, instances } = fakeResizeObserverClass()
  class FailingObserve extends FakeResizeObserver {
    observe() {
      throw new Error('observe')
    }
  }
  const stopFailed = observeElementSize({ element: {}, onSize: () => {}, ResizeObserverImpl: FailingObserve })
  assert.equal(instances[0].disconnected, 1)
  assert.doesNotThrow(stopFailed)
  assert.equal(instances[0].disconnected, 1)
  class FailingDisconnect extends FakeResizeObserver {
    disconnect() {
      super.disconnect()
      throw new TypeError('null')
    }
  }
  const stop = observeElementSize({ element: {}, onSize: () => { throw new Error('consumer') }, ResizeObserverImpl: FailingDisconnect })
  assert.doesNotThrow(() => instances[1].emit([390, 700]))
  assert.doesNotThrow(stop)
  assert.equal(instances[1].disconnected, 1)
})

test('hook lifecycle: resize reaches the current map and teardown disconnects even when SDK cleanup throws', () => {
  const { FakeResizeObserver, instances } = fakeResizeObserverClass()
  const map = fakeSizedMap()
  map.destroy = () => { throw new TypeError("Cannot read properties of null (reading 'destroy')") }
  const refs = { map, listener: {}, stopObserving: null }
  let active = true
  const bounds = []
  refs.stopObserving = observeElementSize({
    element: {},
    ResizeObserverImpl: FakeResizeObserver,
    onSize: createMapResizer({
      map,
      getMaps: () => sizedMaps,
      isCurrent: () => active && refs.map === map,
      initial: { width: 70, height: 700 },
      onResize: () => bounds.push('bounds'),
    }),
  })
  const [observer] = instances
  observer.emit([70, 700])
  observer.emit([390, 700])
  assert.deepEqual(bounds, ['bounds'])
  // useNaverMap.teardownMap 순서: 참조를 비우고, 관찰을 끊고, SDK를 best-effort로 정리한다.
  const teardown = () => {
    const { map: current, listener, stopObserving } = refs
    refs.map = null
    refs.listener = null
    refs.stopObserving = null
    stopObserving?.()
    return teardownNaverMap({ map: current, listeners: [listener], getMaps: () => hostileMaps })
  }
  active = false
  assert.equal(teardown(), 2)
  assert.equal(observer.disconnected, 1)
  observer.emit([800, 600])
  assert.equal(map.calls.filter(([op]) => op === 'setSize').length, 1)
  assert.deepEqual(bounds, ['bounds'])
})
