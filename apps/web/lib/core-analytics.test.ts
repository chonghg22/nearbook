// @vitest-environment jsdom
import { createElement as h, StrictMode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { SWRConfig } from 'swr'
import { SearchBar } from '@/components/search/search-bar'
import { ResultList } from '@/app/search/_components/result-list'
import { BookViewTracker } from '@/app/book/[isbn]/_components/book-view-tracker'
import { LibrarySiteLink } from '@/components/library/library-site-link'
import { PwaRouteTracker } from '@/components/pwa/pwa-route-tracker'
import { trackEvent } from './analytics'
import { requestFailure, searchSubmission } from './analytics-events'
import { ApiRequestError } from './api-request.mjs'
const nav = vi.hoisted(() => ({ push: vi.fn(), pathname: '/' }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push }),
  usePathname: () => nav.pathname,
}))
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('./analytics', () => ({ trackEvent: vi.fn() }))
const fetchMock = vi.fn<typeof fetch>()
const preventNavigation = (event: Event) => event.preventDefault()
beforeEach(() => {
  document.addEventListener('click', preventNavigation)
  vi.mocked(trackEvent).mockClear()
  nav.push.mockClear()
  nav.pathname = '/'
  sessionStorage.clear()
  localStorage.clear()
  history.replaceState({}, '', '/')
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockImplementation(async () =>
    Response.json({ data: [{ isbn: '9788936434120', title: '책', author: null, coverUrl: null }] })
  )
})
afterEach(() => {
  document.removeEventListener('click', preventNavigation)
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
it.each(['header', 'home', 'mobile_header'] as const)(
  'tracks %s submission exactly once and normalizes ISBN',
  (source) => {
    render(h(SearchBar, { analyticsSource: source }))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: ' 8936434128 ' } })
    fireEvent.submit(screen.getByRole('search'))
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith('search_submit', {
      query: '9788936434120',
      searchType: 'isbn',
      invalidIsbn: false,
      source,
    })
    expect(nav.push).toHaveBeenCalledOnce()
  }
)
it('empty and composing forms do not count as submissions', () => {
  render(h(SearchBar))
  fireEvent.submit(screen.getByRole('search'))
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '책 제목' } })
  fireEvent.compositionStart(screen.getByRole('combobox'))
  fireEvent.submit(screen.getByRole('search'))
  expect(trackEvent).not.toHaveBeenCalled()
})
it('suggestion selection records its own rank and never invents a text submission', async () => {
  render(h(SWRConfig, { value: { provider: () => new Map() } }, h(SearchBar)))
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '책 제목' } })
  fireEvent.focus(screen.getByRole('combobox'))
  fireEvent.click(await screen.findByRole('option'))
  expect(trackEvent).toHaveBeenCalledExactlyOnceWith(
    'book_result_click',
    expect.objectContaining({
      isbn: '9788936434120',
      surface: 'suggestion',
      rank: 1,
      source: 'header',
    })
  )
})
it('result selection carries global rank, filter and sort context', () => {
  render(
    h(ResultList, {
      isLoading: false,
      query: '책',
      page: 3,
      pageSize: 10,
      searchType: 'title',
      sort: 'popular',
      items: [
        { isbn: '9788936434120', title: '책', author: null, coverUrl: null, publisher: null },
      ],
    })
  )
  fireEvent.click(screen.getByRole('link', { name: /ISBN/ }))
  expect(trackEvent).toHaveBeenCalledWith(
    'book_result_click',
    expect.objectContaining({ rank: 21, page: 3, searchType: 'title', sort: 'popular' })
  )
})
it('StrictMode does not double count a detail exposure but a different ISBN does', () => {
  const view = render(h(StrictMode, null, h(BookViewTracker, { isbn: 'A' })))
  expect(trackEvent).toHaveBeenCalledTimes(1)
  view.rerender(h(StrictMode, null, h(BookViewTracker, { isbn: 'B' })))
  expect(trackEvent).toHaveBeenCalledTimes(2)
})
it('public route tracking dedupes StrictMode and survives denied storage', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('denied')
  })
  render(h(StrictMode, null, h(PwaRouteTracker)))
  expect(trackEvent).toHaveBeenCalledExactlyOnceWith('page_view')
})
it('official library intent fires on actual click and unsafe destinations have no link', () => {
  const view = render(
    h(LibrarySiteLink, {
      href: 'http://lib.seoul.go.kr/',
      libraryId: '111314',
      children: '공식 사이트',
    })
  )
  expect(trackEvent).not.toHaveBeenCalled()
  const link = screen.getByRole('link')
  expect(link.getAttribute('href')).toBe('http://lib.seoul.go.kr/')
  fireEvent.click(link)
  expect(trackEvent).toHaveBeenCalledExactlyOnceWith('library_click', {
    libraryId: '111314',
    action: 'library_site',
    source: 'library_detail',
  })
  view.rerender(
    h(LibrarySiteLink, {
      href: 'javascript:alert(1)',
      libraryId: '111314',
      children: '공식 사이트',
    })
  )
  expect(screen.queryByRole('link')).toBeNull()
})
it('shared submit contract preserves author selection and errors expose only bounded categories', () => {
  expect(searchSubmission(' 한강 ', 'author', 'search_page')).toEqual({
    query: '한강',
    searchType: 'author',
    invalidIsbn: false,
    source: 'search_page',
  })
  expect(requestFailure(new ApiRequestError('http', 429))).toEqual({
    errorKind: 'http',
    httpStatus: 429,
  })
  expect(requestFailure(new Error('secret URL/body'))).toEqual({ errorKind: 'unknown' })
})
