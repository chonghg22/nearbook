/**
 * Dependency-free core for the /libraries list and map, shared by the browser hook and the proxy routes.
 * Malformed upstream data is an error, never an empty result. Errors never carry URLs or response bodies.
 */

export const MAX_LIBRARY_ROWS = 200
export const MAX_BODY_CHARS = 1_000_000
export const SEOUL_DEFAULT_BOUNDS = Object.freeze({ swLat: 37.4979, swLng: 126.8625, neLat: 37.6351, neLng: 127.0937 })

/**
 * @typedef {{ id: number, name: string, address: string, lat: number, lng: number }} MapLibrary
 * @typedef {{ lat: number, lng: number, zoom: number }} MapCenter
 * @typedef {{ swLat: number, swLng: number, neLat: number, neLng: number }} Bounds
 * @typedef {{ type: 'region' | 'bounds', url: string, key: string, scope: string, debounceMs: number }} LibraryQuery
 * @typedef {{ timeoutMs?: number | undefined, fetchImpl?: typeof fetch | undefined, signal?: AbortSignal | undefined, maxChars?: number | undefined }} FetchOptions
 */

export class MapLibrariesError extends Error {
  /** @param {'http' | 'timeout' | 'network' | 'invalid-response' | 'aborted'} kind @param {number | undefined} [status] */
  constructor(kind, status) {
    super(`Library request failed: ${kind}${status === undefined ? '' : ` (${status})`}`)
    this.name = 'MapLibrariesError'
    this.kind = kind
    this.status = status
  }
}

const invalid = () => new MapLibrariesError('invalid-response')
/** @param {unknown} value */
const isLat = (value) => typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90
/** @param {unknown} value */
const isLng = (value) => typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180

/** @param {any} row @returns {MapLibrary | null} */
function parseLibraryRow(row) {
  if (!row || typeof row !== 'object') return null
  const { id, name, address, lat, lng } = row
  if (!Number.isSafeInteger(id) || id <= 0) return null
  if (typeof name !== 'string' || !name.trim()) return null
  if (address != null && typeof address !== 'string') return null
  if (!isLat(lat) || !isLng(lng)) return null
  return { id, name: name.trim(), address: typeof address === 'string' ? address.trim() : '', lat, lng }
}

/**
 * Strict: one bad row rejects the whole list, so a broken upstream is never shown as "no libraries".
 * Coordinates must already be numbers; null or '' are never coerced to 0.
 * @param {any} json @returns {MapLibrary[]}
 */
export function parseLibraryList(json) {
  const rows = json && typeof json === 'object' ? json.data : undefined
  if (!Array.isArray(rows) || rows.length > MAX_LIBRARY_ROWS) throw invalid()
  return rows.map((row) => {
    const library = parseLibraryRow(row)
    if (!library) throw invalid()
    return library
  })
}

/** @param {any} value @returns {MapCenter | null} */
function parseCenter(value) {
  if (!value || typeof value !== 'object') return null
  const { lat, lng, zoom } = value
  if (!isLat(lat) || !isLng(lng) || !Number.isInteger(zoom) || zoom < 1 || zoom > 21) return null
  return { lat, lng, zoom }
}

/** @param {MapLibrary[]} libraries @param {string} [sigungu] @returns {MapCenter | null} */
export function computeRegionCenter(libraries, sigungu) {
  if (libraries.length === 0) return null
  const lat = libraries.reduce((sum, library) => sum + library.lat, 0) / libraries.length
  const lng = libraries.reduce((sum, library) => sum + library.lng, 0) / libraries.length
  return { lat, lng, zoom: sigungu ? 13 : 11 }
}

/**
 * Map center for the selected region. A district uses only the current response's center; while it is loading,
 * failed or empty (center null) the province's fixed center is used, so a previous district never stays centered.
 * Without a region the map keeps following its own bounds (undefined).
 * @param {{ sido?: string | undefined, sigungu?: string | undefined, provinceCenter?: MapCenter | undefined, responseCenter?: MapCenter | null | undefined }} input
 * @returns {MapCenter | undefined}
 */
export function resolveRegionCenter({ sido, sigungu, provinceCenter, responseCenter }) {
  if (!sido) return undefined
  if (sigungu && responseCenter) return responseCenter
  return provinceCenter ?? responseCenter ?? undefined
}

/**
 * A non-empty region must come with a valid center; a valid empty region has center null.
 * @param {any} json @returns {{ libraries: MapLibrary[], center: MapCenter | null, limited: boolean }}
 */
export function parseRegionResponse(json) {
  const libraries = parseLibraryList(json)
  const center = parseCenter(json.center)
  if (libraries.length > 0 ? !center : json.center !== null) throw invalid()
  if (typeof json.limited !== 'boolean') throw invalid()
  return { libraries, center, limited: json.limited }
}

const COORDINATE_TEXT = /^-?\d{1,3}(?:\.\d{1,20})?$/

/** @param {URLSearchParams} params @returns {Bounds | null} */
export function parseBoundsParams(params) {
  /** @type {Record<string, number>} */
  const values = {}
  for (const key of ['swLat', 'swLng', 'neLat', 'neLng']) {
    const raw = params.get(key)
    if (raw === null || !COORDINATE_TEXT.test(raw)) return null
    values[key] = Number(raw)
  }
  const { swLat, swLng, neLat, neLng } = values
  if (!isLat(swLat) || !isLat(neLat) || !isLng(swLng) || !isLng(neLng)) return null
  if (swLat > neLat || swLng > neLng) return null
  return { swLat, swLng, neLat, neLng }
}

/** @param {string | null | undefined} raw @returns {number | null} */
export function parseLimit(raw, fallback = 100) {
  if (raw === null || raw === undefined) return fallback
  if (!/^\d{1,3}$/.test(raw)) return null
  const limit = Number(raw)
  return limit >= 1 && limit <= MAX_LIBRARY_ROWS ? limit : null
}

// LIKE 와일드카드(%, _)와 제어 문자는 허용하지 않는다.
const REGION_TEXT = /^[가-힣A-Za-z0-9 ]{1,20}$/

/** @param {string | null | undefined} sido @param {string | null | undefined} sigungu @returns {{ sido: string, sigungu: string } | null} */
export function parseRegionParams(sido, sigungu) {
  const s = (sido ?? '').trim()
  const g = (sigungu ?? '').trim()
  if (!REGION_TEXT.test(s) || (g && !REGION_TEXT.test(g))) return null
  return { sido: s, sigungu: g }
}

/**
 * Bound the whole request including the body. A caller abort is reported as 'aborted' so it is
 * never shown as a failure or an empty list.
 * @param {string} url @param {FetchOptions} [options] @returns {Promise<unknown>}
 */
export async function fetchJson(url, { timeoutMs = 8000, fetchImpl = fetch, signal, maxChars = MAX_BODY_CHARS } = {}) {
  if (signal?.aborted) throw new MapLibrariesError('aborted')
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  let timedOut = false
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer
  const stopped = new Promise((_, reject) => {
    controller.signal.addEventListener('abort', () => reject(new MapLibrariesError(timedOut ? 'timeout' : 'aborted')), { once: true })
    timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
  })
  const request = async () => {
    const response = await fetchImpl(url, { cache: 'no-store', signal: controller.signal })
    if (!response.ok) throw new MapLibrariesError('http', response.status)
    const declared = Number(response.headers?.get?.('content-length') ?? 0)
    if (declared > maxChars) throw invalid()
    const text = await response.text()
    if (text.length > maxChars) throw invalid()
    try {
      return JSON.parse(text)
    } catch {
      throw invalid()
    }
  }
  try {
    return await Promise.race([request(), stopped])
  } catch (error) {
    if (controller.signal.aborted) throw new MapLibrariesError(timedOut ? 'timeout' : 'aborted')
    if (error instanceof MapLibrariesError) throw error
    throw new MapLibrariesError('network')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}

/**
 * Fixed, sanitized proxy failure. 429 is kept so clients can back off; everything else is a gateway error.
 * @param {unknown} error @returns {{ status: number, body: { error: string, kind: string } }}
 */
export function proxyError(error) {
  const kind = error instanceof MapLibrariesError ? error.kind : 'network'
  const status = kind === 'timeout' ? 504 : error instanceof MapLibrariesError && error.status === 429 ? 429 : 502
  return { status, body: { error: 'upstream_unavailable', kind } }
}

/**
 * A selected region wins over map bounds until "전체 시도" is chosen, so map idle events cannot replace
 * the selected region. Without bounds (list mode, SDK failure) the Seoul default area is used.
 * @param {{ bounds?: Bounds | null | undefined, sido?: string | undefined, sigungu?: string | undefined }} [input]
 * @returns {LibraryQuery}
 */
export function resolveLibraryQuery({ bounds, sido, sigungu } = {}) {
  if (sido) {
    const params = new URLSearchParams({ sido })
    if (sigungu) params.set('sigungu', sigungu)
    const url = `/api/libraries/by-region?${params}`
    return { type: 'region', url, key: url, scope: url, debounceMs: 0 }
  }
  const b = bounds && [bounds.swLat, bounds.swLng, bounds.neLat, bounds.neLng].every(Number.isFinite) ? bounds : SEOUL_DEFAULT_BOUNDS
  const params = new URLSearchParams({
    swLat: String(b.swLat), swLng: String(b.swLng), neLat: String(b.neLat), neLng: String(b.neLng),
  })
  const url = `/api/libraries/in-bounds?${params}`
  return { type: 'bounds', url, key: url, scope: 'bounds', debounceMs: 300 }
}

/**
 * @param {LibraryQuery} query @param {FetchOptions} [options]
 * @returns {Promise<{ libraries: MapLibrary[], center: MapCenter | null, limited: boolean }>}
 */
export async function requestLibraries(query, options = {}) {
  const json = await fetchJson(query.url, { timeoutMs: 10000, ...options })
  if (query.type === 'region') return parseRegionResponse(json)
  return { libraries: parseLibraryList(json), center: null, limited: false }
}

/**
 * Only the most recent request may update state: starting a new one aborts the previous.
 * @returns {{ begin(): { signal: AbortSignal, isCurrent(): boolean }, cancel(): void }}
 */
export function createLatestRequest() {
  /** @type {AbortController | null} */
  let current = null
  return {
    begin() {
      current?.abort()
      const controller = new AbortController()
      current = controller
      return { signal: controller.signal, isCurrent: () => current === controller && !controller.signal.aborted }
    },
    cancel() {
      current?.abort()
      current = null
    },
  }
}

/** @type {Record<string, string>} */
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/** @param {unknown} value */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)
}

/**
 * Best-effort third-party cleanup: every action runs even if an earlier one throws, and this never throws.
 * The Naver SDK nulls naver.maps and its internals on auth failure, so removeListener/close/setMap/destroy can throw.
 * @param {...((() => unknown) | null | undefined)} actions @returns {number} number of actions that threw
 */
export function runCleanup(...actions) {
  let failed = 0
  for (const action of actions) {
    try {
      action?.()
    } catch {
      failed += 1
    }
  }
  return failed
}

/**
 * Callers capture and clear their refs before calling, so a hostile SDK can never leave a stale map behind.
 * maps is read lazily (it may be null or its getter may throw) and the map is destroyed even if listener removal fails.
 * @param {{ map?: any, listeners?: unknown[] | undefined, getMaps?: (() => any) | undefined }} input @returns {number}
 */
export function teardownNaverMap({ map, listeners = [], getMaps }) {
  return runCleanup(
    ...listeners.map((listener) => () => {
      if (listener) getMaps?.()?.Event?.removeListener?.(listener)
    }),
    () => map?.destroy?.(),
  )
}

/**
 * @typedef {{ id: number, name: string, lat: number, lng: number }} MarkerLibrary
 * @typedef {{ width: number, height: number }} PixelSize
 */

/**
 * InfoWindow content for a marker. The name is escaped and the id encoded, so library data is never parsed as HTML.
 * @param {MarkerLibrary} library @returns {string}
 */
export function libraryPopupHtml(library) {
  return [
    '<div style="background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.15);padding:10px 14px;min-width:140px;text-align:center;">',
    `<p style="font-size:13px;font-weight:600;color:#111;margin:0 0 6px">${escapeHtml(library.name)}</p>`,
    `<a href="/library/${encodeURIComponent(String(library.id))}" style="font-size:12px;color:#2f704f;text-decoration:none;">상세보기 →</a>`,
    '</div>',
  ].join('')
}

/**
 * SDK operations used by the marker layer. Any of them may throw (the SDK nulls its internals on auth failure).
 * @template H
 * @typedef {{
 *   createMarker: (library: MarkerLibrary, selected: boolean, open: () => void) => H,
 *   setPosition: (handle: H, library: MarkerLibrary) => void,
 *   setSelected: (handle: H, selected: boolean) => void,
 *   removeMarker: (handle: H) => void,
 *   openPopup: (handle: H, html: string) => void,
 *   updatePopup: (handle: H, html: string, moved: boolean) => void,
 *   closePopup: () => void,
 * }} MarkerLayerAdapter
 */

/**
 * @typedef {{
 *   sync: (libraries: readonly MarkerLibrary[], selectedId: number | null | undefined, scope: string) => void,
 *   open: (id: number) => boolean,
 *   close: () => void,
 *   openId: () => number | null,
 *   ids: () => number[],
 *   destroy: () => void,
 * }} MarkerLayer
 */

/**
 * One marker per library id. A same-scope list refresh (e.g. InfoWindow auto-pan → idle → bounds refetch) or a
 * selection change never recreates markers or closes the open InfoWindow; its content is re-rendered only if it changed.
 * The InfoWindow closes when the scope changes, its library leaves the list, close() is called or the layer is destroyed.
 * sync/close/destroy never throw; a marker that fails to be created is reported and retried on the next sync.
 * @template H
 * @param {MarkerLayerAdapter<H>} adapter
 * @param {{ onCreateError?: ((id: number, error: unknown) => void) | undefined }} [options]
 * @returns {MarkerLayer}
 */
export function createMarkerLayer(adapter, { onCreateError } = {}) {
  /** @type {Map<number, { handle: H, library: MarkerLibrary, selected: boolean }>} */
  const entries = new Map()
  /** @type {string | undefined} */
  let scope
  /** @type {{ id: number, html: string } | null} */
  let popup = null
  let destroyed = false

  const close = () => {
    if (!popup) return
    popup = null
    runCleanup(() => adapter.closePopup())
  }
  /** @param {number} id */
  const remove = (id) => {
    const entry = entries.get(id)
    if (!entry) return
    entries.delete(id)
    if (popup?.id === id) close()
    runCleanup(() => adapter.removeMarker(entry.handle))
  }

  /** @type {MarkerLayer} */
  const layer = {
    sync(libraries, selectedId, nextScope) {
      if (destroyed) return
      if (scope !== nextScope) {
        close()
        scope = nextScope
      }
      /** @type {Map<number, MarkerLibrary>} */
      const next = new Map()
      for (const library of libraries) if (!next.has(library.id)) next.set(library.id, library)
      for (const id of [...entries.keys()]) if (!next.has(id)) remove(id)
      for (const library of next.values()) {
        const id = library.id
        const selected = id === selectedId
        const entry = entries.get(id)
        if (!entry) {
          try {
            entries.set(id, { handle: adapter.createMarker(library, selected, () => layer.open(id)), library, selected })
          } catch (error) {
            runCleanup(() => onCreateError?.(id, error))
          }
          continue
        }
        const moved = entry.library.lat !== library.lat || entry.library.lng !== library.lng
        if (moved) runCleanup(() => adapter.setPosition(entry.handle, library))
        if (entry.selected !== selected) runCleanup(() => adapter.setSelected(entry.handle, selected))
        entry.library = library
        entry.selected = selected
        const current = popup
        if (current && current.id === id) {
          const html = libraryPopupHtml(library)
          if (moved || html !== current.html) {
            current.html = html
            runCleanup(() => adapter.updatePopup(entry.handle, html, moved))
          }
        }
      }
    },
    open(id) {
      const entry = destroyed ? undefined : entries.get(id)
      if (!entry) return false
      const html = libraryPopupHtml(entry.library)
      popup = { id, html }
      try {
        adapter.openPopup(entry.handle, html)
      } catch {
        popup = null
        runCleanup(() => adapter.closePopup())
        return false
      }
      return popup?.id === id
    },
    close,
    openId: () => popup?.id ?? null,
    ids: () => [...entries.keys()],
    destroy() {
      if (destroyed) return
      destroyed = true
      popup = null
      runCleanup(() => adapter.closePopup())
      for (const id of [...entries.keys()]) remove(id)
    },
  }
  return layer
}

/** @param {PixelSize | undefined} size @returns {PixelSize | null} */
function toPixelSize(size) {
  if (!size) return null
  const width = Math.round(size.width)
  const height = Math.round(size.height)
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? { width, height } : null
}

/**
 * The SDK's own autoResize does not reliably follow parent layout changes (split ↔ map, mobile re-entry), and setSize
 * does not guarantee an idle event. Applies later positive, changed sizes with map.setSize while keeping the center, then
 * calls onResize once. Ignores unchanged/zero sizes, a map that is no longer current (checked again after each SDK call,
 * since setSize may synchronously trigger auth failure/teardown), and re-entry while setSize runs (it may emit idle
 * synchronously). Never throws; a failed attempt is retried.
 * @param {{ map: any, getMaps: () => any, isCurrent: () => boolean, onResize: () => void, initial?: PixelSize | undefined }} input
 * @returns {(size: PixelSize) => boolean} true when the map was resized
 */
export function createMapResizer({ map, getMaps, isCurrent, onResize, initial }) {
  let applied = toPixelSize(initial)
  let resizing = false
  return (size) => {
    const next = toPixelSize(size)
    if (!next || resizing || !isCurrent()) return false
    if (applied && applied.width === next.width && applied.height === next.height) return false
    resizing = true
    try {
      const maps = getMaps()
      if (typeof maps?.Size !== 'function' || typeof map?.setSize !== 'function') return false
      const center = (() => {
        try {
          return map.getCenter?.() ?? null
        } catch {
          return null
        }
      })()
      map.setSize(new maps.Size(next.width, next.height))
      applied = next
      if (!isCurrent()) return false
      if (center) runCleanup(() => map.setCenter(center))
    } catch {
      return false
    } finally {
      resizing = false
    }
    if (!isCurrent()) return false
    runCleanup(onResize)
    return true
  }
}

/**
 * Reports the element's latest content size. Never throws; deliveries after disconnect are dropped.
 * Without ResizeObserver this is a no-op.
 * @param {{ element: Element, onSize: (size: PixelSize) => void, ResizeObserverImpl?: (typeof ResizeObserver) | undefined }} input
 * @returns {() => void} idempotent disconnect
 */
export function observeElementSize({ element, onSize, ResizeObserverImpl = globalThis.ResizeObserver }) {
  const noop = () => {}
  if (typeof ResizeObserverImpl !== 'function') return noop
  let connected = true
  /** @param {ResizeObserverEntry[]} entries */
  const onEntries = (entries) => {
    const entry = entries[entries.length - 1]
    if (connected && entry) runCleanup(() => onSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
  }
  /** @type {ResizeObserver} */
  let observer
  try {
    observer = new ResizeObserverImpl(onEntries)
  } catch {
    return noop
  }
  const disconnect = () => {
    if (!connected) return
    connected = false
    runCleanup(() => observer.disconnect())
  }
  try {
    observer.observe(element)
  } catch {
    disconnect()
    return noop
  }
  return disconnect
}
