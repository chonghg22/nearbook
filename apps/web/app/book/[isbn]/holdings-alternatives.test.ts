// @vitest-environment jsdom
import { createElement as h } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SWRConfig } from 'swr'
import { LibraryStatus } from './_components/library-status'
import { LocationProvider, useLocationContext } from '@/lib/use-location-context'
import type { NearbyHolding } from '@nearbook/shared-types'

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))
const fetchMock = vi.fn<typeof fetch>()
const gpsMock = vi.fn()
let context: ReturnType<typeof useLocationContext>
function Probe() {
  context = useLocationContext()
  return null
}

function payload(
  statuses: NearbyHolding['status'][] = ['not_held'],
  nearbyCount = statuses.length,
  stale = false
) {
  const now = new Date().toISOString()
  const source = 'jeongbonaru:bookExist'
  const libraries = statuses.map((status, i) => ({
    id: 111314 + i,
    name: `검증도서관${i}`,
    homepage: 'https://lib.example.test/',
    lat: 37.56,
    lng: 126.97,
    distanceKm: i,
    status,
    source,
    stale,
    hasBook: status === 'unknown' ? null : status !== 'not_held',
    loanAvailable: status === 'unknown' ? null : status === 'available',
    checkedAt: status === 'unknown' ? null : now,
    lastAttemptAt: now,
  }))
  return {
    libraries,
    holdings: {
      source,
      nearbyCount,
      attemptedCount: statuses.length,
      checkedCount: statuses.filter((s) => s !== 'unknown').length,
      heldCount: statuses.filter((s) => s === 'borrowed' || s === 'available').length,
      availableCount: statuses.filter((s) => s === 'available').length,
      borrowedCount: statuses.filter((s) => s === 'borrowed').length,
      notHeldCount: statuses.filter((s) => s === 'not_held').length,
      unknownCount: statuses.filter((s) => s === 'unknown').length,
      uncheckedCount: nearbyCount - statuses.length,
      limited: nearbyCount > statuses.length,
    },
  }
}
function mount(isbn = '9788936434120', title = '소년이 온다 : 한강 장편소설') {
  const content = (nextIsbn: string, nextTitle: string) =>
    h(
      SWRConfig,
      { value: { provider: () => new Map(), revalidateOnFocus: false } },
      h(
        LocationProvider,
        null,
        h(LibraryStatus, { isbn: nextIsbn, bookTitle: nextTitle }),
        h(Probe)
      )
    )
  const view = render(content(isbn, title))
  return { ...view, updateBook: (next: string) => view.rerender(content(next, title)) }
}
const alternatives = () => screen.findByRole('region', { name: '책을 찾는 다른 방법' })
const radiusOf = (url: unknown) =>
  new URL(String(url), 'https://example.test').searchParams.get('radius')
beforeEach(() => {
  localStorage.clear()
  fetchMock.mockReset()
  gpsMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: gpsMock },
  })
  fetchMock.mockImplementation(async () => Response.json(payload()))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'geolocation')
})

it('real nonownership offers all actions while retaining official card links', async () => {
  mount()
  const panel = await alternatives()
  expect(screen.getByText(/소장하지 않는 것으로/)).toBeDefined()
  expect(within(panel).getByRole('button', { name: '10km로 넓혀보기' })).toBeDefined()
  expect(within(panel).getByRole('button', { name: '다른 지역·도서관 선택' })).toBeDefined()
  const search = within(panel).getByRole('link', { name: '같은 제목·다른 판본 검색' })
  const params = new URL(search.getAttribute('href')!, 'https://example.test').searchParams
  expect(params.get('q')).toBe('소년이 온다')
  expect(params.get('searchType')).toBe('title')
  expect(
    within(panel).getByRole('link', { name: '이 책 찜하기로 이동' }).getAttribute('href')
  ).toBe('#book-wishlist')
  expect(within(panel).getByRole('link', { name: '찜한 책 알림 설정' }).getAttribute('href')).toBe(
    '/me/notifications'
  )
  expect(
    within(panel).getByRole('link', { name: '다른 도서관 찾아보기' }).getAttribute('href')
  ).toBe('/libraries')
  expect(
    screen
      .getByRole('link', { name: '공식 사이트에서 확인 — 검증도서관0, 새 탭' })
      .getAttribute('href')
  ).toBe('https://lib.example.test/')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(radiusOf(fetchMock.mock.calls[0]?.[0])).toBe('5')
  expect(
    fetchMock.mock.calls.every(
      ([url, init]) =>
        String(url).startsWith('/api/books/') && (!init?.method || init.method === 'GET')
    )
  ).toBe(true)
  expect(gpsMock).not.toHaveBeenCalled()
})
it.each(['borrowed', 'unknown'] as const)(
  '%s retains its own state instead of claiming absence',
  async (status) => {
    fetchMock.mockImplementation(async () => Response.json(payload([status])))
    mount()
    await alternatives()
    expect(screen.queryByText(/소장하지 않는 것으로/)).toBeNull()
    expect(screen.getByText(status === 'borrowed' ? '대출 불가' : '확인 불가')).toBeDefined()
  }
)
it('zero candidates has a region/radius fallback, not an invented official homepage', async () => {
  fetchMock.mockImplementation(async () => Response.json(payload([])))
  mount()
  await alternatives()
  expect(screen.getByText(/도서관을 찾지 못했습니다/)).toBeDefined()
  expect(screen.queryByRole('link', { name: /공식 사이트에서 확인/ })).toBeNull()
  expect(screen.getByRole('link', { name: '다른 도서관 찾아보기' })).toBeDefined()
})
it('limited unknown coverage is not treated as exhaustive nonownership', async () => {
  fetchMock.mockImplementation(async () => Response.json(payload(['not_held', 'unknown'], 30)))
  mount()
  await alternatives()
  expect(screen.getByText(/28곳은 확인하지 않았습니다/)).toBeDefined()
  expect(screen.queryByText(/소장하지 않는 것으로/)).toBeNull()
  expect(screen.getByRole('button', { name: '보유 현황 다시 확인' })).toBeDefined()
})
it('a real endpoint failure keeps retry and alternatives without implying absence', async () => {
  fetchMock.mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
  mount()
  await alternatives()
  expect(screen.getByRole('alert').textContent).toContain('책이 없다는 뜻은 아닙니다')
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
  await screen.findByText(/소장하지 않는 것으로/)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls.every(([url]) => radiusOf(url) === '5')).toBe(true)
})
it('does not add alternatives to a successful available result', async () => {
  fetchMock.mockImplementation(async () => Response.json(payload(['available'])))
  mount()
  await screen.findByRole('link', { name: /공식 사이트에서 확인/ })
  expect(screen.queryByRole('region', { name: '책을 찾는 다른 방법' })).toBeNull()
  expect(screen.getByRole('button', { name: '5km' }).getAttribute('aria-pressed')).toBe('true')
})
it('only user actions expand 5 → 10 → 20 and repeated current radius never refetches', async () => {
  mount()
  await alternatives()
  fireEvent.click(screen.getByRole('button', { name: '10km로 넓혀보기' }))
  await screen.findByRole('button', { name: '20km로 넓혀보기' })
  fireEvent.click(screen.getByRole('button', { name: '20km로 넓혀보기' }))
  await screen.findByText(/최대 반경 20km/)
  expect(fetchMock.mock.calls.map(([url]) => radiusOf(url))).toEqual(['5', '10', '20'])
  fireEvent.click(screen.getByRole('button', { name: '20km' }))
  expect(fetchMock).toHaveBeenCalledTimes(3)
  expect(screen.queryByRole('button', { name: /40km/ })).toBeNull()
  expect(screen.getByText(/결과가 같을 수 있습니다/)).toBeDefined()
})
it('loading disables expansion and old results disappear before a new radius resolves', async () => {
  let resolve!: (res: Response) => void
  mount()
  await alternatives()
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done
      })
  )
  fireEvent.click(screen.getByRole('button', { name: '10km로 넓혀보기' }))
  expect(screen.queryByRole('region', { name: '책을 찾는 다른 방법' })).toBeNull()
  expect(
    (screen.getByRole('button', { name: '20km' }) as HTMLButtonElement).disabled ||
      screen.getByRole('button', { name: '20km' }).closest('fieldset')?.disabled
  ).toBe(true)
  expect(screen.queryByRole('link', { name: /공식 사이트에서 확인/ })).toBeNull()
  await act(async () => {
    resolve(Response.json(payload(['available'])))
  })
  await screen.findByRole('link', { name: /공식 사이트에서 확인/ })
  expect(screen.queryByRole('region', { name: '책을 찾는 다른 방법' })).toBeNull()
})
it('new ISBN resets to 5km and aborts an outstanding old-book request', async () => {
  const view = mount()
  await alternatives()
  let resolve!: (res: Response) => void
  let signal: AbortSignal | null | undefined
  fetchMock.mockImplementationOnce((_url, init) => {
    signal = init?.signal
    return new Promise((done) => {
      resolve = done
    })
  })
  fireEvent.click(screen.getByRole('button', { name: '10km로 넓혀보기' }))
  view.updateBook('9788954682152')
  await alternatives()
  expect(signal?.aborted).toBe(true)
  expect(fetchMock.mock.calls.map(([url]) => radiusOf(url))).toEqual(['5', '10', '5'])
  await act(async () => {
    resolve(Response.json(payload(['available'])))
  })
  expect(screen.getByRole('region', { name: '책을 찾는 다른 방법' })).toBeDefined()
  view.updateBook('9788936434120')
  await alternatives()
  expect(radiusOf(fetchMock.mock.calls.at(-1)?.[0])).toBe('5')
})
it('manual region selection resets radius and can return to the old region without reviving 20km', async () => {
  mount()
  await alternatives()
  fireEvent.click(screen.getByRole('button', { name: '20km' }))
  await screen.findByText(/최대 반경 20km/)
  fireEvent.click(screen.getByRole('button', { name: '다른 지역·도서관 선택' }))
  const dialog = await screen.findByRole('dialog', { name: '어느 지역 도서관을 볼까요?' })
  fireEvent.click(within(dialog).getByRole('button', { name: '부산광역시' }))
  fireEvent.click(within(dialog).getByRole('button', { name: '부산 중심' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await alternatives()
  expect(radiusOf(fetchMock.mock.calls.at(-1)?.[0])).toBe('5')
  expect(context.location.label).toBe('부산광역시')
  await act(async () => {
    context.selectRegion('seoul')
  })
  await alternatives()
  expect(radiusOf(fetchMock.mock.calls.at(-1)?.[0])).toBe('5')
  expect(gpsMock).not.toHaveBeenCalled()
})
it('timers only age observations: no automatic expansion, retry, or private writes', async () => {
  vi.useFakeTimers()
  await act(async () => {
    mount()
  })
  expect(screen.getByRole('region', { name: '책을 찾는 다른 방법' })).toBeDefined()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120_000)
  })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(gpsMock).not.toHaveBeenCalled()
})
