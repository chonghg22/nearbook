/** @typedef {{homepage: string | null, lat: number | null, lng: number | null}} LibraryLinks */
/** @typedef {import('@nearbook/shared-types').NearbyHolding & Partial<LibraryLinks>} LinkedHolding */
/** @typedef {Omit<import('@nearbook/shared-types').HoldingsResult, 'libraries'> & {libraries: LinkedHolding[]}} LinkedHoldingsResult */

/** Optional metadata must never turn a known holding into an error or an empty result.
 * @param {unknown} value
 * @returns {string | null}
 */
export function safeLibraryHomepage(value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value.trim())) return null
  try {
    const url = new URL(value.trim())
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
    return url.href
  } catch {
    return null
  }
}

/** @param {unknown} lat @param {unknown} lng */
function coordinates(lat, lng) {
  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180
  )
}

/** @param {Record<string, unknown>} row @returns {LibraryLinks} */
export function parseLibraryLinks(row) {
  const valid = coordinates(row.lat, row.lng)
  const homepage = safeLibraryHomepage(row.homepage)
  return {
    // The legacy source still lists HTTP; this exact HTTPS landing page was verified.
    // Do not assume every library supports HTTPS or invent a book/reservation path.
    homepage: homepage === 'http://lib.seoul.go.kr/' ? 'https://lib.seoul.go.kr/' : homepage,
    lat: valid ? /** @type {number} */ (row.lat) : null,
    lng: valid ? /** @type {number} */ (row.lng) : null,
  }
}

/** Destination only: never send the user's GPS/reference location to the map provider.
 * Documented URL: https://apis.map.kakao.com/web/guide/#routeurl
 * @param {unknown} lat @param {unknown} lng @param {string} name
 * @returns {string | null}
 */
export function libraryDirectionsUrl(lat, lng, name) {
  if (!coordinates(lat, lng) || !name.trim()) return null
  return `https://map.kakao.com/link/to/${encodeURIComponent(name.trim())},${lat},${lng}`
}
