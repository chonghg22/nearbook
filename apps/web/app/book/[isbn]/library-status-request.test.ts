// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { trackEvent } from '@/lib/analytics'
import { LibraryStatus } from './_components/library-status'

// Reproduce the absolute API setting which previously bypassed the public proxy.
vi.mock('@/lib/constants', () => ({ PUBLIC_API_BASE_URL: 'https://api.example.test' }))
vi.mock('@/lib/use-location-context', () => ({
  useLocationContext: () => ({
    isLoaded: true,
    location: { mode: 'region', label: '서울특별시', lat: 37.5665, lng: 126.978 },
  }),
}))
vi.mock('@/components/location-bar', () => ({ LocationBar: () => null }))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))

const fetchMock = vi.fn<typeof fetch>()
function payload() {
  const now = new Date().toISOString()
  return {
    libraries: [
      {
        id: 111314,
        name: '서울도서관',
        homepage: 'http://lib.seoul.go.kr/',
        lat: 37.5663245,
        lng: 126.977752,
        distanceKm: 0,
        status: 'available',
        hasBook: true,
        loanAvailable: true,
        checkedAt: now,
        lastAttemptAt: now,
        stale: false,
        source: 'jeongbonaru:bookExist',
      },
    ],
    holdings: {
      nearbyCount: 1,
      attemptedCount: 1,
      checkedCount: 1,
      heldCount: 1,
      availableCount: 1,
      borrowedCount: 0,
      notHeldCount: 0,
      unknownCount: 0,
      uncheckedCount: 0,
      limited: false,
      source: 'jeongbonaru:bookExist',
    },
  }
}
beforeEach(() => {
  vi.mocked(trackEvent).mockClear()
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockImplementation(async (url) => {
    if (!String(url).startsWith('/api/')) throw new TypeError('Blocked by CORS')
    return Response.json(payload())
  })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

it('loads the pictured ISBN through same-origin proxy and renders both CTA links', async () => {
  render(createElement(LibraryStatus, { isbn: '9788954682152' }))
  const official = await screen.findByRole('link', {
    name: '공식 사이트에서 확인 — 서울도서관, 새 탭',
  })
  expect(official.getAttribute('href')).toBe('https://lib.seoul.go.kr/')
  expect(
    screen.getByRole('link', { name: '서울도서관 길찾기 — 카카오맵, 새 탭' }).getAttribute('href')
  ).toContain(',37.5663245,126.977752')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [url, init] = fetchMock.mock.calls[0]!
  expect(url).toBe('/api/books/9788954682152/holdings?lat=37.5665&lng=126.978&radius=5')
  expect(init?.credentials).toBe('same-origin')
  expect(init?.cache).toBe('no-store')
  expect(new Headers(init?.headers).has('Authorization')).toBe(false)
  expect(screen.queryByRole('alert')).toBeNull()
  const complete = vi.mocked(trackEvent).mock.calls.find(([type]) => type === 'holdings_request_completed')?.[1]
  expect(complete).toMatchObject({ checkedCount: 1, heldCount: 1, availableCount: 1, outcome: 'complete', staleCount: 0, durationMs: expect.any(Number) })
  expect(JSON.stringify(complete)).not.toMatch(/37\.5665|126\.978/)
  fireEvent.click(official)
  expect(trackEvent).toHaveBeenCalledWith('library_click', expect.objectContaining({ requestId: complete?.requestId, action: 'library_site' }))
})

it('keeps real failure distinct and retry recovers through the same public route', async () => {
  fetchMock.mockResolvedValueOnce(new Response('upstream unavailable', { status: 503 }))
  render(createElement(LibraryStatus, { isbn: '9788954682152' }))
  expect((await screen.findByRole('alert')).textContent).toContain('책이 없다는 뜻은 아닙니다')
  expect(screen.queryByRole('link', { name: /공식 사이트에서 확인/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
  await screen.findByRole('link', { name: '공식 사이트에서 확인 — 서울도서관, 새 탭' })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  const failures = vi.mocked(trackEvent).mock.calls.filter(([type]) => type === 'holdings_request_failed')
  expect(failures).toHaveLength(1)
  expect(failures[0]?.[1]).toMatchObject({ errorKind: 'http', httpStatus: 503 })
  const completions = vi.mocked(trackEvent).mock.calls.filter(([type]) => type === 'holdings_request_completed')
  expect(completions).toHaveLength(1)
  expect(completions[0]?.[1]?.requestId).not.toBe(failures[0]?.[1]?.requestId)
  expect(fetchMock.mock.calls.every(([url]) => String(url).startsWith('/api/books/'))).toBe(true)
})

it('unmounted requests never become completion or failure events', async () => {
  let finish!: (response: Response) => void
  fetchMock.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
  const view = render(createElement(LibraryStatus, { isbn: '9788954682152' }))
  view.unmount()
  finish(Response.json(payload()))
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(trackEvent).not.toHaveBeenCalled()
})

it.each(['unknown', 'not_held', 'stale'] as const)('preserves %s completion semantics without conflating held and available counts', async (state) => {
  const data = payload()
  if (state === 'stale') data.libraries[0]!.checkedAt = new Date(Date.now() - 360000).toISOString()
  else {
    Object.assign(data.libraries[0]!, { status: state, hasBook: state === 'unknown' ? null : false,
      loanAvailable: state === 'unknown' ? null : false, checkedAt: state === 'unknown' ? null : new Date().toISOString() })
    Object.assign(data.holdings, { checkedCount: state === 'unknown' ? 0 : 1, heldCount: 0, availableCount: 0, unknownCount: state === 'unknown' ? 1 : 0, notHeldCount: state === 'not_held' ? 1 : 0 })
  }
  fetchMock.mockResolvedValue(Response.json(data))
  render(createElement(LibraryStatus, { isbn: '9788954682152' }))
  await screen.findByRole('link', { name: /공식 사이트에서 확인/ })
  expect(trackEvent).toHaveBeenCalledWith('holdings_request_completed', expect.objectContaining({
    outcome: state === 'unknown' ? 'unknown' : 'complete', staleCount: state === 'stale' ? 1 : 0,
    checkedCount: state === 'unknown' ? 0 : 1,
    heldCount: state === 'stale' ? 1 : 0, availableCount: state === 'stale' ? 1 : 0,
  }))
})
