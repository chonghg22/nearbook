import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SERVER_API_BASE_URL } from '@/lib/constants'

const mocks = vi.hoisted(() => ({
  collectSitemapBooks: vi.fn(),
  collectSitemapLibraries: vi.fn(),
  defaultFetchJson: vi.fn(),
}))

vi.mock('@/lib/seo/sitemap-source', async () => {
  const actual = await vi.importActual<typeof import('@/lib/seo/sitemap-source')>(
    '@/lib/seo/sitemap-source',
  )
  return {
    ...actual,
    collectSitemapBooks: mocks.collectSitemapBooks,
    collectSitemapLibraries: mocks.collectSitemapLibraries,
    defaultFetchJson: mocks.defaultFetchJson,
  }
})

import sitemap from './sitemap'

function urlsOf(entries: Awaited<ReturnType<typeof sitemap>>) {
  return entries.map((entry) => entry.url)
}

describe('sitemap 메타 라우트', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('APP_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.near-book.com')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    mocks.collectSitemapBooks.mockResolvedValue({ books: [{ isbn: '9788936434120' }], stats: null })
    mocks.collectSitemapLibraries.mockResolvedValue([
      { id: 111003, lastModified: '2026-05-07T03:06:01.081Z' },
    ])
    mocks.defaultFetchJson.mockResolvedValue({ data: [] })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('운영 배포는 정적·카테고리·책·도서관 URL을 반환한다', async () => {
    const urls = urlsOf(await sitemap())

    expect(urls).toContain('https://www.near-book.com/')
    expect(urls).toContain('https://www.near-book.com/category/novel')
    expect(urls).toContain('https://www.near-book.com/book/9788936434120')
    expect(urls).toContain('https://www.near-book.com/library/111003')
  })

  it('noindex 라우트는 sitemap에 포함하지 않는다', async () => {
    const urls = urlsOf(await sitemap())

    for (const path of ['/search', '/scan', '/events', '/me', '/login', '/offline', '/unsubscribe']) {
      expect(urls).not.toContain(`https://www.near-book.com${path}`)
    }
  })

  it('색인 대상인 목록 페이지를 빠짐없이 포함한다', async () => {
    const urls = urlsOf(await sitemap())

    for (const path of ['/popular', '/rising', '/keywords', '/new-books', '/libraries', '/qna', '/notices']) {
      expect(urls).toContain(`https://www.near-book.com${path}`)
    }
  })

  it('preview 배포에서는 빈 목록을 반환하고 API를 호출하지 않는다', async () => {
    vi.stubEnv('APP_ENV', '')
    vi.stubEnv('VERCEL_ENV', 'preview')

    await expect(sitemap()).resolves.toEqual([])
    expect(mocks.collectSitemapBooks).not.toHaveBeenCalled()
    expect(mocks.collectSitemapLibraries).not.toHaveBeenCalled()
  })

  it('책 수집이 실패해도 정적과 도서관 URL은 유지한다', async () => {
    mocks.collectSitemapBooks.mockRejectedValue(new Error('books down'))

    const urls = urlsOf(await sitemap())

    expect(urls).toContain('https://www.near-book.com/')
    expect(urls).toContain('https://www.near-book.com/library/111003')
    expect(urls.some((url) => url.includes('/book/'))).toBe(false)
  })

  it('도서관 수집이 실패해도 정적과 책 URL은 유지한다', async () => {
    mocks.collectSitemapLibraries.mockRejectedValue(new Error('libraries down'))

    const urls = urlsOf(await sitemap())

    expect(urls).toContain('https://www.near-book.com/book/9788936434120')
    expect(urls.some((url) => url.includes('/library/'))).toBe(false)
  })

  it('모든 동적 수집이 실패해도 정적 URL로 유효한 sitemap을 반환한다', async () => {
    mocks.collectSitemapBooks.mockRejectedValue(new Error('down'))
    mocks.collectSitemapLibraries.mockRejectedValue(new Error('down'))
    mocks.defaultFetchJson.mockRejectedValue(new Error('down'))

    const urls = urlsOf(await sitemap())

    expect(urls.length).toBeGreaterThan(0)
    expect(urls).toContain('https://www.near-book.com/')
  })

  it('변경되지 않는 정적 페이지에 현재 시각을 lastModified로 쓰지 않는다', async () => {
    const entries = await sitemap()
    const home = entries.find((entry) => entry.url === 'https://www.near-book.com/')
    const terms = entries.find((entry) => entry.url === 'https://www.near-book.com/terms')

    expect(home?.lastModified).toBe('2026-08-10')
    expect(terms?.lastModified).toBe('2026-05-07')
  })

  it('갱신 시각을 모르는 책 URL에는 lastModified를 넣지 않는다', async () => {
    const entries = await sitemap()
    const book = entries.find((entry) => entry.url.includes('/book/'))

    expect(book?.lastModified).toBeUndefined()
  })

  it('공지 수집도 공통 상수의 절대 URL로 요청한다', async () => {
    await sitemap()

    expect(mocks.defaultFetchJson).toHaveBeenCalledWith(`${SERVER_API_BASE_URL}/notices?pageSize=50`)
  })

  it('도서관 URL은 API가 준 갱신 시각을 그대로 쓴다', async () => {
    const entries = await sitemap()
    const library = entries.find((entry) => entry.url.includes('/library/'))

    expect(library?.lastModified).toBe('2026-05-07T03:06:01.081Z')
  })
})
