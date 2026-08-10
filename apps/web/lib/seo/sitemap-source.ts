import { CATEGORIES } from '@/lib/category-config'

/**
 * sitemap에 넣을 동적 URL 수집.
 *
 * 설계 원칙
 * - 한 소스가 실패해도 다른 소스의 URL은 살아남는다.
 * - 실패를 조용히 삼키지 않는다. 반드시 로그를 남긴다.
 * - 존재하지 않는 lastModified를 지어내지 않는다.
 */

/** Google 한도는 50,000이다. 여유를 두고 45,000에서 자른다. */
export const SITEMAP_MAX_URLS = 45000

/**
 * popular_books(1순위)가 이 수를 넘으면 보충 소스를 호출하지 않는다.
 * 파이프라인이 복구되면 코드 수정 없이 1순위만 사용하는 경로로 전환된다.
 */
export const MIN_PRIMARY_BOOKS = 200

export type FetchJson = (url: string) => Promise<unknown>

/**
 * API는 초당 10회로 제한된다(@nestjs/throttler short: 10/1s).
 * sitemap은 6시간에 한 번만 생성되므로 속도보다 완결성을 택해 요청 간격을 둔다.
 */
export const DEFAULT_REQUEST_SPACING_MS = 150
const DEFAULT_RETRY_DELAY_MS = 1500
const MAX_ATTEMPTS = 2

export type CollectOptions = {
  /** 요청 사이 최소 간격. 테스트에서는 0으로 둔다. */
  spacingMs?: number
  /** 실패 후 재시도까지 대기 시간. */
  retryDelayMs?: number
}

export type SitemapBook = {
  isbn: string
}

export type SitemapLibrary = {
  id: number
  lastModified?: string | undefined
}

export type BookSourceStats = {
  /** popular_books에서 확보한 유효 건수 */
  primary: number
  /** 보충 소스에서 추가로 확보한 유효 건수 */
  fallback: number
  /** ISBN 형식·체크섬 검증에서 제외된 건수 */
  invalid: number
  /** 중복으로 제외된 건수 */
  duplicate: number
  total: number
  usedFallback: boolean
}

function getApiBaseUrl() {
  return process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
}

export const defaultFetchJson: FetchJson = async (url) => {
  const res = await fetch(url, { next: { revalidate: 21600 } })
  if (!res.ok) {
    throw new Error(`sitemap source responded ${res.status} for ${url}`)
  }
  return res.json()
}

function readDataArray(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== 'object') return []
  const data = (payload as { data?: unknown }).data
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  if (Array.isArray(payload)) return payload as Record<string, unknown>[]
  return []
}

/** 하이픈·공백을 제거하고 대문자로 정규화한다. */
export function normalizeIsbn(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const normalized = String(value).replace(/[\s-]/g, '').toUpperCase()
  return normalized.length > 0 ? normalized : null
}

/** ISBN-13 형식과 체크섬을 검증한다. 도서 상세 URL이 되는 값이라 엄격하게 본다. */
export function isValidIsbn13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false
  if (!value.startsWith('978') && !value.startsWith('979')) return false

  const sum = value
    .slice(0, 12)
    .split('')
    .reduce((acc, digit, index) => acc + Number(digit) * (index % 2 === 0 ? 1 : 3), 0)
  const checkDigit = (10 - (sum % 10)) % 10

  return checkDigit === Number(value[12])
}

function sleep(ms: number) {
  if (ms <= 0) return Promise.resolve()
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/**
 * 순차 호출 + 1회 재시도.
 * rate limit(429)이나 일시적 오류로 sitemap URL이 통째로 빠지는 것을 막는다.
 */
function createPacedFetch(fetchJson: FetchJson, options: CollectOptions = {}) {
  const spacingMs = options.spacingMs ?? DEFAULT_REQUEST_SPACING_MS
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS
  let first = true

  return async function pacedFetch(url: string): Promise<unknown> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      if (!first) await sleep(spacingMs)
      first = false

      try {
        return await fetchJson(url)
      } catch (error) {
        if (attempt === MAX_ATTEMPTS) throw error
        console.error(`[sitemap] 요청 실패, 재시도합니다: ${url}`, error)
        await sleep(retryDelayMs)
      }
    }

    throw new Error(`unreachable: ${url}`)
  }
}

async function fetchIsbns(fetchJson: FetchJson, url: string): Promise<unknown[]> {
  const payload = await fetchJson(url)
  return readDataArray(payload).map((row) => row.isbn)
}

/**
 * 책 URL 수집.
 *
 * 1순위: popular_books (`/books/popular`)
 * 보충: 1순위가 MIN_PRIMARY_BOOKS 미만일 때만 카테고리·인기대출·급상승에서 채운다.
 */
export async function collectSitemapBooks(
  fetchJson: FetchJson = defaultFetchJson,
  options: CollectOptions = {},
): Promise<{ books: SitemapBook[]; stats: BookSourceStats }> {
  const api = getApiBaseUrl()
  const pacedFetch = createPacedFetch(fetchJson, options)
  const seen = new Set<string>()
  const stats: BookSourceStats = {
    primary: 0,
    fallback: 0,
    invalid: 0,
    duplicate: 0,
    total: 0,
    usedFallback: false,
  }

  const collect = (rawIsbns: unknown[], bucket: 'primary' | 'fallback') => {
    for (const raw of rawIsbns) {
      const normalized = normalizeIsbn(raw)
      if (!normalized || !isValidIsbn13(normalized)) {
        stats.invalid += 1
        continue
      }
      if (seen.has(normalized)) {
        stats.duplicate += 1
        continue
      }
      seen.add(normalized)
      stats[bucket] += 1
    }
  }

  try {
    collect(await fetchIsbns(pacedFetch, `${api}/books/popular?region=전국&limit=5000`), 'primary')
  } catch (error) {
    console.error('[sitemap] popular_books 수집 실패', error)
  }

  if (stats.primary < MIN_PRIMARY_BOOKS) {
    stats.usedFallback = true

    const fallbackUrls = [
      ...CATEGORIES.map(
        (category) =>
          `${api}/books/by-category?categoryCode=${encodeURIComponent(category.kdcCode)}&limit=100`,
      ),
      `${api}/books/loan-item?limit=20`,
      `${api}/books/hot-trend?limit=20`,
    ]

    // 병렬로 던지면 API rate limit(429)에 걸려 대부분이 실패한다. 순차로 수집한다.
    for (const url of fallbackUrls) {
      try {
        collect(await fetchIsbns(pacedFetch, url), 'fallback')
      } catch (error) {
        console.error(`[sitemap] 보충 소스 수집 실패: ${url}`, error)
      }
    }
  }

  stats.total = seen.size

  console.info(
    `[sitemap] books primary=${stats.primary} fallback=${stats.fallback} invalid=${stats.invalid} duplicate=${stats.duplicate} total=${stats.total} usedFallback=${stats.usedFallback}`,
  )

  return {
    books: Array.from(seen, (isbn) => ({ isbn })),
    stats,
  }
}

/** 도서관 API는 limit 최대 100이라 page를 올리며 전량 수집한다. */
export const LIBRARY_PAGE_SIZE = 100
const LIBRARY_MAX_PAGES = 40

export async function collectSitemapLibraries(
  fetchJson: FetchJson = defaultFetchJson,
  options: CollectOptions = {},
): Promise<SitemapLibrary[]> {
  const api = getApiBaseUrl()
  const pacedFetch = createPacedFetch(fetchJson, options)
  const libraries: SitemapLibrary[] = []
  const seen = new Set<number>()

  for (let page = 1; page <= LIBRARY_MAX_PAGES; page += 1) {
    let rows: Record<string, unknown>[]

    try {
      rows = readDataArray(
        await pacedFetch(`${api}/libraries?limit=${LIBRARY_PAGE_SIZE}&page=${page}`),
      )
    } catch (error) {
      // 중간 페이지가 실패해도 그때까지 모은 도서관은 버리지 않는다.
      console.error(`[sitemap] 도서관 목록 ${page}페이지 수집 실패`, error)
      break
    }

    for (const row of rows) {
      const id = Number(row.id)
      if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue
      seen.add(id)
      libraries.push({
        id,
        lastModified: typeof row.updatedAt === 'string' ? row.updatedAt : undefined,
      })
    }

    if (rows.length < LIBRARY_PAGE_SIZE) break
  }

  console.info(`[sitemap] libraries total=${libraries.length}`)

  return libraries
}

/**
 * URL 목록을 sitemap 한도 단위로 나눈다.
 * 지금은 단일 sitemap이지만, 5만 URL을 넘길 때 generateSitemaps로 전환하기 위한 준비다.
 */
export function shardEntries<T>(entries: T[], size: number = SITEMAP_MAX_URLS): T[][] {
  if (size <= 0) throw new Error('shard size must be positive')
  if (entries.length === 0) return [[]]

  const shards: T[][] = []
  for (let index = 0; index < entries.length; index += size) {
    shards.push(entries.slice(index, index + size))
  }
  return shards
}

/**
 * 한도를 넘으면 잘라낸다.
 * 초과한 sitemap은 검색엔진이 전체를 거부하므로, 앞부분만 유효하게 남기는 편이 안전하다.
 */
export function enforceSitemapLimit<T>(entries: T[], limit: number = SITEMAP_MAX_URLS): T[] {
  if (entries.length <= limit) return entries

  console.error(
    `[sitemap] URL ${entries.length}건이 한도 ${limit}건을 넘었습니다. 앞에서부터 ${limit}건만 제공합니다. generateSitemaps 분할 전환이 필요합니다.`,
  )
  return entries.slice(0, limit)
}
