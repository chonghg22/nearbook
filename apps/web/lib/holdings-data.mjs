import { ApiRequestError, requestApiJson } from './api-request.mjs'
import { parseLibraryLinks } from './library-links.mjs'

const statuses = new Set(['available', 'borrowed', 'not_held', 'unknown'])
/** @type {'jeongbonaru:bookExist'} */
const source = 'jeongbonaru:bookExist'
const ttlMs = 5 * 60 * 1000

/** @param {unknown} value @returns {value is Record<string, any>} */
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value) }
/** @param {unknown} value */
function integer(value) { return Number.isSafeInteger(value) && Number(value) >= 0 }
/** @param {unknown} value @param {number} now */
function instant(value, now) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) <= now + 60000
}

/** Strict contract: reject legacy 0/1 counts rather than invent quantities or absence.
 * @param {unknown} payload @param {number} [now]
 * @returns {import('./library-links.mjs').LinkedHoldingsResult}
 */
export function parseHoldings(payload, now = Date.now()) {
  if (!object(payload) || !Array.isArray(payload.libraries) || payload.libraries.length > 10 || !object(payload.holdings)) throw new Error('Invalid holdings response')
  const ids = new Set()
  const libraries = payload.libraries.map((row) => {
    if (!object(row) || !integer(row.id) || row.id === 0 || ids.has(row.id) ||
        typeof row.name !== 'string' || !row.name.trim() || row.source !== source || !statuses.has(row.status) ||
        ![true, false, null].includes(row.hasBook) || ![true, false, null].includes(row.loanAvailable) ||
        typeof row.stale !== 'boolean' || !instant(row.lastAttemptAt, now) ||
        (row.checkedAt !== null && !instant(row.checkedAt, now)) ||
        (row.distanceKm !== undefined && (typeof row.distanceKm !== 'number' || !Number.isFinite(row.distanceKm) || row.distanceKm < 0))) throw new Error('Invalid holdings row')
    if ((row.status === 'available' && (row.hasBook !== true || row.loanAvailable !== true)) ||
        (row.status === 'borrowed' && (row.hasBook !== true || row.loanAvailable !== false)) ||
        (row.status === 'not_held' && (row.hasBook !== false || row.loanAvailable !== false)) ||
        (row.status !== 'unknown' && row.checkedAt === null) ||
        (row.status === 'unknown' && (row.hasBook === false || row.loanAvailable !== null))) throw new Error('Conflicting holdings state')
    ids.add(row.id)
    const stale = row.stale || (row.checkedAt !== null && now - Date.parse(row.checkedAt) >= ttlMs)
    return { id: row.id, name: row.name.trim(), ...parseLibraryLinks(row), ...(row.distanceKm === undefined ? {} : { distanceKm: row.distanceKm }),
      status: row.status, hasBook: row.hasBook, loanAvailable: row.loanAvailable,
      source, checkedAt: row.checkedAt, lastAttemptAt: row.lastAttemptAt, stale }
  })
  const h = payload.holdings
  const counts = ['nearbyCount', 'attemptedCount', 'checkedCount', 'heldCount', 'availableCount', 'borrowedCount', 'notHeldCount', 'unknownCount', 'uncheckedCount']
  if (h.source !== source || typeof h.limited !== 'boolean' || counts.some((key) => !integer(h[key])) ||
      h.nearbyCount > 30 || h.attemptedCount !== libraries.length || h.nearbyCount < h.attemptedCount ||
      h.uncheckedCount !== h.nearbyCount - h.attemptedCount || h.limited !== (h.uncheckedCount > 0) ||
      h.checkedCount !== libraries.filter((row) => row.status !== 'unknown').length ||
      h.heldCount !== libraries.filter((row) => row.hasBook === true).length ||
      h.availableCount !== libraries.filter((row) => row.status === 'available').length ||
      h.borrowedCount !== libraries.filter((row) => row.status === 'borrowed').length ||
      h.notHeldCount !== libraries.filter((row) => row.status === 'not_held').length ||
      h.unknownCount !== libraries.filter((row) => row.status === 'unknown').length) throw new Error('Invalid holdings summary')
  return { libraries, holdings: { source, nearbyCount: h.nearbyCount, attemptedCount: h.attemptedCount,
    checkedCount: h.checkedCount, heldCount: h.heldCount, availableCount: h.availableCount,
    borrowedCount: h.borrowedCount, notHeldCount: h.notHeldCount, unknownCount: h.unknownCount,
    uncheckedCount: h.uncheckedCount, limited: h.limited } }
}

/** @param {import('@nearbook/shared-types').HoldingsResult} result */
export function holdingsMessage(result) {
  const h = result.holdings
  if (h.nearbyCount === 0) return '설정한 반경에서 도서관을 찾지 못했습니다. 기준 지역을 변경해 보세요.'
  if (h.heldCount > 0) return null
  if (h.unknownCount > 0) return '일부 도서관의 보유 현황을 확인하지 못했습니다. 책이 없다는 뜻은 아닙니다.'
  if (h.limited) return '확인한 도서관에서는 소장이 확인되지 않았습니다. 주변의 모든 도서관을 확인한 결과는 아닙니다.'
  return '확인한 주변 도서관에서는 이 책을 소장하지 않는 것으로 조회됐습니다. 공식 사이트에서 한 번 더 확인해 주세요.'
}

/** @param {string} url @param {{timeoutMs?: number, fetchImpl?: typeof fetch, signal?: AbortSignal}} [options]
 * @returns {Promise<import('./library-links.mjs').LinkedHoldingsResult>}
 */
export async function loadHoldings(url, { timeoutMs = 15000, fetchImpl = fetch, signal } = {}) {
  const payload = await requestApiJson(url, { timeoutMs, fetchImpl, signal })
  try { return parseHoldings(payload) } catch { throw new ApiRequestError('invalid-response') }
}
