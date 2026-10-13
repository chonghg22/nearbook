import { requestDetail } from './detail-request.mjs'

/** @param {unknown} value @returns {Record<string, unknown>} */
function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid-response')
  return /** @type {Record<string, unknown>} */ (value)
}
/** @param {unknown} value @returns {string} */
function text(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('invalid-response')
  return value.trim()
}
/** @param {unknown} value @returns {string | null} */
function optionalText(value) {
  if (value == null) return null
  if (typeof value !== 'string') throw new Error('invalid-response')
  return value
}
/** @param {unknown} value @returns {number} */
function count(value) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('invalid-response')
  return value
}
/** @param {unknown} value @returns {string | null} */
export function validPeriod(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}(?:-\d{2})?$/.test(value)) return null
  const iso = value.length === 7 ? `${value}-01` : value
  const date = new Date(`${iso}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(iso) ? value : null
}
/** @param {unknown} value @returns {string | null} */
function validInstant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null
  if (!validPeriod(value.slice(0, 10))) return null
  const instant = new Date(value)
  return Number.isFinite(instant.getTime()) ? instant.toISOString() : null
}
/** Only image hosts already allowed in next.config.ts. Bad covers use a placeholder, not a crashed page.
 * @param {unknown} value @returns {string | null} */
function cover(value) {
  if (value == null || value === '') return null
  if (typeof value !== 'string') throw new Error('invalid-response')
  try {
    const url = new URL(value)
    const allowed = ['image.aladin.co.kr', 'www.aladin.co.kr', 'cover.nl.go.kr', 'bookthumb-phinf.pstatic.net']
    return allowed.includes(url.hostname) && !url.username && !url.password &&
      (url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'image.aladin.co.kr')) ? url.href : null
  } catch { return null }
}

/** @param {unknown} payload @param {'books' | 'categories' | 'libraries'} kind @returns {Record<string, unknown>[]} */
export function parseExploreItems(payload, kind) {
  const data = object(payload).data
  if (!Array.isArray(data) || data.length > 500) throw new Error('invalid-response')
  return data.map((value) => {
    const row = object(value)
    const timing = { curationPeriod: validPeriod(row.curationPeriod ?? row.periodKey), fetchedAt: validInstant(row.fetchedAt) }
    if (kind === 'books') {
      const isbn = text(row.isbn)
      if (!/^(?:\d{13}|\d{9}[\dXx])$/.test(isbn)) throw new Error('invalid-response')
      return {
        isbn, title: text(row.title), author: optionalText(row.author), publisher: optionalText(row.publisher),
        coverUrl: cover(row.coverUrl), category: optionalText(row.category),
        loanCount: row.loanCount == null ? null : count(row.loanCount),
        difference: row.difference == null ? null : count(row.difference), ...timing,
      }
    }
    if (kind === 'categories') {
      const code = text(row.code ?? row.categoryCode)
      if (!/^\d{1,3}$/.test(code)) throw new Error('invalid-response')
      return { code, name: optionalText(row.name), count: count(row.count), ...timing }
    }
    const id = count(row.id)
    if (id === 0) throw new Error('invalid-response')
    return {
      id, name: text(row.name), address: optionalText(row.address), region: optionalText(row.region),
      bookCount: row.bookCount == null ? null : count(row.bookCount), ...timing,
    }
  })
}

/** @param {string} url @param {'books' | 'categories' | 'libraries'} kind
 * @param {{ timeoutMs?: number, fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<{ status: 'ready' | 'empty' | 'error', items: Record<string, unknown>[] }>} */
export async function loadExploreItems(url, kind, options) {
  try {
    const items = parseExploreItems(await requestDetail(url, options), kind)
    return { status: items.length ? 'ready' : 'empty', items }
  } catch {
    return { status: 'error', items: [] }
  }
}

/** Snapshot age is not proof of a running or successful refresh job.
 * @param {{ curationPeriod?: unknown, fetchedAt?: unknown }[]} items
 * @param {{ curationPeriod?: unknown, fetchedAt?: unknown } | undefined} [fallback]
 * @param {number} [now]
 * @returns {{ period: string | null, collectedAt: string | null, state: 'stale' | 'known' | 'unknown' }} */
export function curationTiming(items, fallback, now = Date.now()) {
  const periods = items.map((item) => validPeriod(item.curationPeriod)).filter((p) => p !== null).sort()
  const instants = items.map((item) => validInstant(item.fetchedAt)).filter((p) => p !== null).sort()
  const period = periods[0] ?? validPeriod(fallback?.curationPeriod)
  const candidate = instants[0] ?? validInstant(fallback?.fetchedAt)
  const collectedAt = candidate && Date.parse(candidate) <= now + 300000 ? candidate : null
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now))
  const oldPeriod = period !== null && period < today.slice(0, period.length)
  const oldCollection = collectedAt !== null && now - Date.parse(collectedAt) > 48 * 3600000
  return { period, collectedAt, state: oldPeriod || oldCollection ? 'stale' : collectedAt ? 'known' : 'unknown' }
}

/** @param {unknown} value @returns {string | null} */
export function validLibraryId(value) {
  return typeof value === 'string' && /^[1-9]\d{0,9}$/.test(value) && Number.isSafeInteger(Number(value)) ? value : null
}
