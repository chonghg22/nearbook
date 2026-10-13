import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CategoryPage from '@/app/category/page'
import NewBooksPage, { metadata as newBooksMetadata } from '@/app/new-books/page'
import { exploreBooks, exploreCategories, exploreLibraries } from '@/lib/explore-server'

vi.mock('@/lib/explore-server', () => ({ exploreBooks: vi.fn(), exploreCategories: vi.fn(), exploreLibraries: vi.fn() }))
vi.mock('next/link', async () => {
  const { createElement } = await import('react')
  return { default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => createElement('a', props, children) }
})
vi.mock('next/image', async () => {
  const { createElement } = await import('react')
  return { default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }) }
})

describe('explore page partial failures and selection', () => {
  beforeEach(() => vi.resetAllMocks())
  it('optional category counts outage preserves the actual books and all category links', async () => {
    vi.mocked(exploreCategories).mockResolvedValue({ status: 'error', items: [] })
    vi.mocked(exploreBooks).mockResolvedValue({ status: 'ready', items: [{ isbn: '9788936434120', title: '소년이 온다' }] })
    const html = renderToStaticMarkup(await CategoryPage())
    expect(html).toContain('소년이 온다')
    expect(html).toContain('href="/category/novel"')
    expect(html).toContain('집계 정보를 불러오지 못했습니다')
    expect(html).not.toContain('목록을 불러오지 못했습니다')
  })
  it('featured libraries outage preserves requested retry and does not request books for a fictitious library', async () => {
    vi.mocked(exploreLibraries).mockResolvedValue({ status: 'error', items: [] })
    const html = renderToStaticMarkup(await NewBooksPage({ searchParams: Promise.resolve({ libraryId: '126024' }) }))
    expect(html).toContain('role="alert"')
    expect(html).toContain('href="/new-books?libraryId=126024"')
    expect(html).not.toContain('먼저 도서관을 선택')
    expect(exploreBooks).not.toHaveBeenCalled()
  })
  it('genuine empty featured libraries are not displayed as a request failure', async () => {
    vi.mocked(exploreLibraries).mockResolvedValue({ status: 'empty', items: [] })
    const html = renderToStaticMarkup(await NewBooksPage({}))
    expect(html).toContain('저장된 신착도서 목록이 있는 도서관이 없습니다')
    expect(html).not.toContain('role="alert"')
    expect(exploreBooks).not.toHaveBeenCalled()
  })
  it('a valid selected library is retained when its books fail', async () => {
    vi.mocked(exploreLibraries).mockResolvedValue({ status: 'ready', items: [
      { id: 126024, name: '해운대도서관', address: null, region: null, bookCount: 40 },
      { id: 111492, name: '성북길빛도서관', address: null, region: null, bookCount: 40 },
    ] })
    vi.mocked(exploreBooks).mockResolvedValue({ status: 'error', items: [] })
    const html = renderToStaticMarkup(await NewBooksPage({ searchParams: Promise.resolve({ libraryId: '111492' }) }))
    expect(exploreBooks).toHaveBeenCalledWith('/libraries/111492/new-arrivals?limit=40')
    expect(html).toContain('성북길빛도서관 신착도서')
    expect(html).toContain('href="/new-books?libraryId=111492"')
    expect(newBooksMetadata.alternates?.canonical).toBe('https://www.near-book.com/new-books')
  })
})
