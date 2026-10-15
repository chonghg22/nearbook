// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
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
})

it('keeps real failure distinct and retry recovers through the same public route', async () => {
  fetchMock.mockResolvedValueOnce(new Response('upstream unavailable', { status: 503 }))
  render(createElement(LibraryStatus, { isbn: '9788954682152' }))
  expect((await screen.findByRole('alert')).textContent).toContain('책이 없다는 뜻은 아닙니다')
  expect(screen.queryByRole('link', { name: /공식 사이트에서 확인/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
  await screen.findByRole('link', { name: '공식 사이트에서 확인 — 서울도서관, 새 탭' })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls.every(([url]) => String(url).startsWith('/api/books/'))).toBe(true)
})
