import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  collectSitemapBooks,
  collectSitemapLibraries,
  enforceSitemapLimit,
  isValidIsbn13,
  normalizeIsbn,
  shardEntries,
} from './sitemap-source'

const ISBN_A = '9788936434120'
const ISBN_B = '9788932473574'
const ISBN_C = '9788954699914'
const ISBN_D = '9791162540640'
const ISBN_E = '9788937473135'

/** 테스트에서는 요청 간격과 재시도 대기를 없앤다. */
const NO_WAIT = { spacingMs: 0, retryDelayMs: 0 }

function booksPayload(isbns: string[]) {
  return { data: isbns.map((isbn) => ({ isbn })) }
}

function librariesPayload(ids: number[], updatedAt?: string) {
  return { data: ids.map((id) => ({ id, updatedAt })) }
}

beforeEach(() => {
  vi.stubEnv('INTERNAL_API_URL', 'http://api.test')
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('ISBN 검증', () => {
  it('하이픈과 공백을 제거해 정규화한다', () => {
    expect(normalizeIsbn('978-89-364-3412-0')).toBe('9788936434120')
    expect(normalizeIsbn(' 9788936434120 ')).toBe('9788936434120')
    expect(normalizeIsbn(null)).toBeNull()
  })

  it('체크섬이 맞는 ISBN-13만 통과시킨다', () => {
    expect(isValidIsbn13('9788936434120')).toBe(true)
    expect(isValidIsbn13('9788936434121')).toBe(false)
  })

  it('978/979로 시작하지 않거나 자릿수가 다르면 통과시키지 않는다', () => {
    expect(isValidIsbn13('1234567890123')).toBe(false)
    expect(isValidIsbn13('978893643412')).toBe(false)
    expect(isValidIsbn13('')).toBe(false)
  })
})

describe('책 sitemap 소스', () => {
  it('popular_books 결과가 충분하면 보충 소스를 호출하지 않는다', async () => {
    // 최소 기준(200)을 넘기기 위해 유효 ISBN을 반복 생성하는 대신 기준 미만/이상을 구분해 검증한다.
    const primaryIsbns = Array.from({ length: 250 }, (_, index) => makeIsbn(index))
    const fetchJson = vi.fn(async (url: string) => {
      if (url.includes('/books/popular')) return booksPayload(primaryIsbns)
      throw new Error(`호출되면 안 되는 URL: ${url}`)
    })

    const { books, stats } = await collectSitemapBooks(fetchJson, NO_WAIT)

    expect(stats.usedFallback).toBe(false)
    expect(stats.primary).toBe(250)
    expect(stats.fallback).toBe(0)
    expect(books).toHaveLength(250)
    expect(fetchJson).toHaveBeenCalledTimes(1)
  })

  it('popular_books가 비어 있으면 보충 소스로 URL을 확보한다', async () => {
    const fetchJson = vi.fn(async (url: string) => {
      if (url.includes('/books/popular')) return { data: [] }
      if (url.includes('/books/by-category')) return booksPayload([ISBN_A])
      if (url.includes('/books/loan-item')) return booksPayload([ISBN_B])
      if (url.includes('/books/hot-trend')) return booksPayload([ISBN_C])
      return { data: [] }
    })

    const { books, stats } = await collectSitemapBooks(fetchJson, NO_WAIT)

    expect(stats.usedFallback).toBe(true)
    expect(stats.primary).toBe(0)
    expect(stats.fallback).toBe(3)
    expect(books.map((book) => book.isbn).sort()).toEqual(
      [ISBN_A, ISBN_B, ISBN_C].sort(),
    )
  })

  it('popular_books가 실패해도 보충 소스로 sitemap을 채운다', async () => {
    const fetchJson = vi.fn(async (url: string) => {
      if (url.includes('/books/popular')) throw new Error('timeout')
      if (url.includes('/books/by-category')) return booksPayload([ISBN_D])
      return { data: [] }
    })

    const { books, stats } = await collectSitemapBooks(fetchJson, NO_WAIT)

    expect(stats.primary).toBe(0)
    expect(books).toEqual([{ isbn: ISBN_D }])
  })

  it('보충 소스 일부가 실패해도 성공한 소스의 URL은 유지한다', async () => {
    const fetchJson = vi.fn(async (url: string) => {
      if (url.includes('/books/popular')) return { data: [] }
      if (url.includes('/books/by-category')) throw new Error('500')
      if (url.includes('/books/loan-item')) return booksPayload([ISBN_E])
      return { data: [] }
    })

    const { books } = await collectSitemapBooks(fetchJson, NO_WAIT)

    expect(books).toEqual([{ isbn: ISBN_E }])
  })

  it('유효하지 않은 ISBN을 제외한다', async () => {
    const fetchJson = vi.fn(async (url: string) => {
      if (url.includes('/books/popular')) {
        return booksPayload([ISBN_A, '9788936434121', 'ABC', ''])
      }
      return { data: [] }
    })

    const { books, stats } = await collectSitemapBooks(fetchJson, NO_WAIT)

    expect(books).toEqual([{ isbn: ISBN_A }])
    expect(stats.invalid).toBe(3)
  })

  it('중복 ISBN을 한 번만 포함한다', async () => {
    const fetchJson = vi.fn(async (url: string) => {
      if (url.includes('/books/popular')) {
        return booksPayload([ISBN_A, '978-89-364-3412-0'])
      }
      return { data: [] }
    })

    const { books, stats } = await collectSitemapBooks(fetchJson, NO_WAIT)

    expect(books).toHaveLength(1)
    expect(stats.duplicate).toBe(1)
  })

  it('소스별 확보 건수를 통계로 반환한다', async () => {
    const fetchJson = vi.fn(async (url: string) => {
      if (url.includes('/books/popular')) return booksPayload([ISBN_A])
      if (url.includes('/books/loan-item')) return booksPayload([ISBN_B, ISBN_A])
      return { data: [] }
    })

    const { stats } = await collectSitemapBooks(fetchJson, NO_WAIT)

    expect(stats).toEqual({
      primary: 1,
      fallback: 1,
      invalid: 0,
      duplicate: 1,
      total: 2,
      usedFallback: true,
    })
  })

  it('응답 형태가 예상과 달라도 예외를 던지지 않는다', async () => {
    const fetchJson = vi.fn(async () => ({ data: 'unexpected' }))

    const { books } = await collectSitemapBooks(fetchJson, NO_WAIT)

    expect(books).toEqual([])
  })
})

describe('도서관 sitemap 소스', () => {
  it('마지막 페이지까지 페이지네이션으로 수집한다', async () => {
    const fetchJson = vi.fn(async (url: string) => {
      if (url.includes('page=1')) return librariesPayload(range(1, 100), '2026-05-07T03:06:01.081Z')
      if (url.includes('page=2')) return librariesPayload(range(101, 130))
      return { data: [] }
    })

    const libraries = await collectSitemapLibraries(fetchJson, NO_WAIT)

    expect(libraries).toHaveLength(130)
    expect(libraries[0]).toEqual({ id: 1, lastModified: '2026-05-07T03:06:01.081Z' })
    expect(libraries[129]).toEqual({ id: 130, lastModified: undefined })
    expect(fetchJson).toHaveBeenCalledTimes(2)
  })

  it('중간 페이지가 실패하면 그때까지 수집한 URL은 유지한다', async () => {
    const fetchJson = vi.fn(async (url: string) => {
      if (url.includes('page=1')) return librariesPayload(range(1, 100))
      throw new Error('timeout')
    })

    const libraries = await collectSitemapLibraries(fetchJson, NO_WAIT)

    expect(libraries).toHaveLength(100)
  })

  it('일시적 rate limit은 한 번 재시도해서 URL을 지켜낸다', async () => {
    let page2Attempts = 0
    const fetchJson = vi.fn(async (url: string) => {
      if (url.includes('page=1')) return librariesPayload(range(1, 100))
      if (url.includes('page=2')) {
        page2Attempts += 1
        // 첫 시도만 429로 실패하고 재시도에서 성공한다.
        if (page2Attempts === 1) throw new Error('responded 429')
        return librariesPayload(range(101, 150))
      }
      return { data: [] }
    })

    const libraries = await collectSitemapLibraries(fetchJson, NO_WAIT)

    expect(page2Attempts).toBe(2)
    expect(libraries).toHaveLength(150)
  })

  it('첫 페이지부터 실패하면 빈 목록을 반환한다', async () => {
    const fetchJson = vi.fn(async () => {
      throw new Error('down')
    })

    await expect(collectSitemapLibraries(fetchJson, NO_WAIT)).resolves.toEqual([])
  })

  it('중복 id는 한 번만 포함한다', async () => {
    const fetchJson = vi.fn(async (url: string) => {
      if (url.includes('page=1')) return librariesPayload([1, 1, 2])
      return { data: [] }
    })

    const libraries = await collectSitemapLibraries(fetchJson, NO_WAIT)

    expect(libraries.map((library) => library.id)).toEqual([1, 2])
  })
})

describe('sitemap 분할과 한도', () => {
  it('한도 단위로 URL을 나눈다', () => {
    expect(shardEntries([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('비어 있으면 빈 shard 하나를 반환한다', () => {
    expect(shardEntries([], 10)).toEqual([[]])
  })

  it('한도 이하면 그대로 둔다', () => {
    expect(enforceSitemapLimit([1, 2, 3], 5)).toEqual([1, 2, 3])
  })

  it('한도를 넘으면 앞에서부터 잘라 유효한 sitemap을 유지한다', () => {
    expect(enforceSitemapLimit([1, 2, 3, 4], 2)).toEqual([1, 2])
    expect(console.error).toHaveBeenCalled()
  })
})

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

/** 체크섬이 유효한 ISBN-13을 순번으로 생성한다. */
function makeIsbn(index: number) {
  const body = `978${String(index).padStart(9, '0')}`
  const sum = body
    .split('')
    .reduce((acc, digit, position) => acc + Number(digit) * (position % 2 === 0 ? 1 : 3), 0)
  return `${body}${(10 - (sum % 10)) % 10}`
}
