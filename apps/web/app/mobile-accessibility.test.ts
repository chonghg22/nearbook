// @vitest-environment jsdom
import { createElement as h } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { SWRConfig } from 'swr'
import { SearchBar } from '@/components/search/search-bar'
import { MobileSearchTrigger } from '@/components/layout/mobile-search-trigger'
import { LocationProvider } from '@/lib/use-location-context'
import { LocationBar } from '@/components/location-bar'
import { LibrariesMapView } from './libraries/_components/libraries-map-view'
import { Pagination } from './search/_components/pagination'
import { SearchBar as ResultSearchBar } from './search/_components/search-bar'

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => h('img', { alt }) }))
// SDK/network map mechanics are covered elsewhere; no real map, GPS or camera in DOM tests.
vi.mock('@/components/maps/naver-interactive-map', () => ({
  NaverInteractiveMap: () => h('div', { 'data-testid': 'map' }),
}))

const fetchMock = vi.fn<typeof fetch>()
const books = [
  { isbn: '9788936434120', title: '소년이 온다', author: '한강', coverUrl: null, publisher: null },
  {
    isbn: '9788936434410',
    title: '긴 제목'.repeat(80),
    author: '긴 저자'.repeat(30),
    coverUrl: null,
    publisher: null,
  },
]
let media: MediaQueryList & EventTarget
let viewport: EventTarget & { height: number; offsetTop: number }
beforeEach(() => {
  router.push.mockReset()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  localStorage.clear()
  sessionStorage.clear()
  media = Object.assign(new EventTarget(), {
    matches: true,
    media: '(max-width: 767px)',
  }) as typeof media
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => media) })
  viewport = Object.assign(new EventTarget(), { height: 800, offsetTop: 0 })
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
  fetchMock.mockImplementation(async (url) =>
    Response.json(
      String(url).includes('suggest')
        ? { data: books }
        : String(url).includes('by-region')
          ? {
              data: [
                {
                  id: 111314,
                  name: '검증용 중구 도서관',
                  address: '서울특별시 중구',
                  lat: 37.56,
                  lng: 126.97,
                },
              ],
              center: { lat: 37.56, lng: 126.97, zoom: 12 },
              limited: false,
            }
          : { data: [] }
    )
  )
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(window, 'visualViewport')
})
function mountBar(props = {}) {
  return render(
    h(
      SWRConfig,
      { value: { provider: () => new Map(), revalidateOnFocus: false } },
      h(SearchBar, props)
    )
  )
}
async function suggest() {
  const input = screen.getByRole('combobox', { name: '책 제목·저자·ISBN 검색' })
  fireEvent.change(input, { target: { value: '한강' } })
  await screen.findByRole('listbox', { name: '추천 도서' })
  return input
}
it('links a uniquely named combobox/listbox and keeps options out of the Tab sequence', async () => {
  mountBar()
  const input = await suggest()
  const list = screen.getByRole('listbox')
  expect(input.getAttribute('aria-autocomplete')).toBe('list')
  expect(input.getAttribute('aria-controls')).toBe(list.id)
  expect(input.getAttribute('aria-expanded')).toBe('true')
  expect(input.hasAttribute('aria-activedescendant')).toBe(false)
  for (const item of within(list).getAllByRole('option')) {
    expect(item.getAttribute('tabindex')).toBe('-1')
    expect(item.getAttribute('aria-selected')).toBe('false')
  }
})
it('Arrow keys retain input focus, select bounded options, and Enter navigates once', async () => {
  const submitted = vi.fn()
  mountBar({ onSubmitted: submitted })
  const input = await suggest()
  input.focus()
  fireEvent.keyDown(input, { key: 'ArrowUp' })
  const options = screen.getAllByRole('option')
  expect(input.getAttribute('aria-activedescendant')).toBe(options[1]!.id)
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(input.getAttribute('aria-activedescendant')).toBe(options[1]!.id)
  fireEvent.keyDown(input, { key: 'ArrowUp' })
  expect(options[0]!.getAttribute('aria-selected')).toBe('true')
  expect(document.activeElement).toBe(input)
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(router.push).toHaveBeenCalledExactlyOnceWith('/book/9788936434120')
  expect(submitted).toHaveBeenCalledOnce()
  expect(screen.queryByRole('listbox')).toBeNull()
})
it('Escape retains the query, clears selection, and ArrowDown reopens the popup', async () => {
  mountBar()
  const input = await suggest()
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  fireEvent.keyDown(input, { key: 'Escape' })
  expect((input as HTMLInputElement).value).toBe('한강')
  expect(input.getAttribute('aria-expanded')).toBe('false')
  expect(input.hasAttribute('aria-activedescendant')).toBe(false)
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(screen.getAllByRole('option')[0]!.getAttribute('aria-selected')).toBe('true')
  expect(router.push).not.toHaveBeenCalled()
})
it('Tab closes suggestions without intercepting normal focus movement', async () => {
  mountBar()
  const input = await suggest()
  expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(true)
  expect(screen.queryByRole('listbox')).toBeNull()
})
it('composition and native IME keycode never activate a selected book or submit prematurely', async () => {
  mountBar()
  const input = await suggest()
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
  expect(router.push).not.toHaveBeenCalled()
  fireEvent.compositionStart(input)
  fireEvent.keyDown(input, { key: 'Enter' })
  fireEvent.submit(screen.getByRole('search'))
  expect(router.push).not.toHaveBeenCalled()
  fireEvent.compositionEnd(input)
  fireEvent.submit(screen.getByRole('search'))
  expect(router.push).toHaveBeenCalledExactlyOnceWith('/search?q=%ED%95%9C%EA%B0%95')
})
it('typing invalidates the old debounced selection immediately and never opens a stale book', async () => {
  mountBar()
  const input = await suggest()
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  fireEvent.change(input, { target: { value: '새 검색어' } })
  expect(screen.queryByRole('listbox')).toBeNull()
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(router.push).not.toHaveBeenCalled()
  fireEvent.submit(screen.getByRole('search'))
  expect(router.push).toHaveBeenCalledExactlyOnceWith(
    `/search?q=${encodeURIComponent('새 검색어')}`
  )
})
it('click selection and clear retain existing public navigation without writes', async () => {
  mountBar()
  const input = await suggest()
  fireEvent.click(screen.getAllByRole('option')[1]!)
  expect(router.push).toHaveBeenCalledExactlyOnceWith('/book/9788936434410')
  fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }))
  expect((input as HTMLInputElement).value).toBe('')
  expect(document.activeElement).toBe(input)
  expect(
    fetchMock.mock.calls.every(([, init]) => init?.method === undefined || init.method === 'GET')
  ).toBe(true)
})
it('a failed suggestion request still allows direct search and exposes no fabricated options', async () => {
  fetchMock.mockImplementation(async () => new Response('', { status: 503 }))
  mountBar()
  const input = screen.getByRole('combobox')
  fireEvent.change(input, { target: { value: '한강' } })
  expect((await screen.findByRole('status')).textContent).toContain('입력한 검색어로 검색')
  expect(input.getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByRole('option')).toBeNull()
  fireEvent.submit(screen.getByRole('search'))
  expect(router.push).toHaveBeenCalledOnce()
})
it('multiple header/home bars have distinct popup IDs', async () => {
  render(h(SWRConfig, { value: { provider: () => new Map() } }, h(SearchBar), h(SearchBar)))
  const inputs = screen.getAllByRole('combobox')
  for (const input of inputs) fireEvent.change(input, { target: { value: '한강' } })
  await waitFor(() => expect(screen.getAllByRole('listbox')).toHaveLength(2))
  expect(inputs[0]!.getAttribute('aria-controls')).not.toBe(
    inputs[1]!.getAttribute('aria-controls')
  )
})
it('the actual mobile dialog consumes popup Escape first, then closes and restores trigger focus', async () => {
  render(h(SWRConfig, { value: { provider: () => new Map() } }, h(MobileSearchTrigger)))
  const trigger = screen.getByRole('button', { name: '검색 열기' })
  trigger.focus()
  fireEvent.click(trigger)
  const dialog = await screen.findByRole('dialog', { name: '검색' })
  const input = await suggest()
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(screen.getByRole('dialog')).toBe(dialog)
  expect(screen.queryByRole('listbox')).toBeNull()
  fireEvent.keyDown(input, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(document.activeElement).toBe(trigger)
})
it('mobile search reacts to keyboard viewport resize/offset and keeps suggestions in scroll flow', async () => {
  render(h(SWRConfig, { value: { provider: () => new Map() } }, h(MobileSearchTrigger)))
  fireEvent.click(screen.getByRole('button', { name: '검색 열기' }))
  const dialog = await screen.findByRole('dialog')
  act(() => {
    viewport.height = 320
    viewport.offsetTop = 12
    viewport.dispatchEvent(new Event('resize'))
  })
  expect(dialog.style.maxHeight).toBe('304px')
  expect(dialog.style.top).toBe('12px')
  await suggest()
  expect(screen.getByRole('listbox').className).not.toContain('absolute')
  expect(dialog.className).toContain('overflow-y-auto')
})
it('location sheet moves above the keyboard; manual selection restores focus without GPS', async () => {
  const gps = vi.fn()
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: gps },
  })
  render(h(LocationProvider, null, h(LocationBar)))
  const trigger = screen.getByRole('button', { name: '지역·도서관 변경' })
  trigger.focus()
  fireEvent.click(trigger)
  const dialog = await screen.findByRole('dialog')
  act(() => {
    viewport.height = 320
    viewport.offsetTop = 0
    viewport.dispatchEvent(new Event('resize'))
  })
  expect(dialog.style.maxHeight).toBe('304px')
  expect(dialog.style.getPropertyValue('--visual-viewport-bottom')).toBe('480px')
  fireEvent.click(within(dialog).getByRole('button', { name: '부산광역시' }))
  fireEvent.click(within(dialog).getByRole('button', { name: '부산 중심' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(document.activeElement).toBe(trigger)
  expect(gps).not.toHaveBeenCalled()
  Reflect.deleteProperty(navigator, 'geolocation')
})
it('without visualViewport, the dialog retains its CSS dynamic-height fallback', async () => {
  Reflect.deleteProperty(window, 'visualViewport')
  render(h(MobileSearchTrigger))
  fireEvent.click(screen.getByRole('button', { name: '검색 열기' }))
  expect((await screen.findByRole('dialog')).className).toContain('max-h-[85dvh]')
})
it('search result form allows shrinking input, preserves 44+ targets, and protects composition', () => {
  const submit = vi.fn()
  render(h(ResultSearchBar, { defaultValue: '', onSubmit: submit }))
  const input = screen.getByRole('textbox')
  expect(input.className).toContain('min-w-0')
  expect(input.getAttribute('enterkeyhint')).toBe('search')
  expect(screen.getByRole('link', { name: '바코드 스캔' }).className).toContain('shrink-0')
  fireEvent.change(input, { target: { value: '한강' } })
  fireEvent.compositionStart(input)
  fireEvent.submit(screen.getByRole('search'))
  expect(submit).not.toHaveBeenCalled()
  fireEvent.compositionEnd(input)
  fireEvent.submit(screen.getByRole('search'))
  expect(submit).toHaveBeenCalledExactlyOnceWith('한강')
})
it('pagination wraps all buttons instead of shrinking touch targets on narrow screens', () => {
  const change = vi.fn()
  render(h(Pagination, { currentPage: 7, totalPages: 100, onPageChange: change }))
  expect(screen.getByRole('navigation').className).toContain('flex-wrap')
  expect(screen.getByRole('button', { name: '7 페이지' }).getAttribute('aria-current')).toBe('page')
  fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }))
  expect(change).toHaveBeenCalledExactlyOnceWith(8)
})
it('mobile list/map switches announce state and preserve region filters', async () => {
  render(h(LibrariesMapView))
  expect(screen.getByRole('button', { name: '지도' }).getAttribute('aria-pressed')).toBe('true')
  fireEvent.change(screen.getByRole('combobox', { name: '시도' }), {
    target: { value: '서울특별시' },
  })
  fireEvent.change(screen.getByRole('combobox', { name: '시군구' }), { target: { value: '중구' } })
  fireEvent.click(screen.getByRole('button', { name: '목록' }))
  expect(screen.getByRole('button', { name: '목록' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.queryByTestId('map')).toBeNull()
  expect(await screen.findByRole('link', { name: /검증용 중구 도서관/ })).toBeTruthy()
  expect(
    fetchMock.mock.calls.some(
      ([url]) => new URL(String(url), 'https://example.test').searchParams.get('sigungu') === '중구'
    )
  ).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: '지도' }))
  expect((screen.getByRole('combobox', { name: '시군구' }) as HTMLSelectElement).value).toBe('중구')
  expect(screen.getByTestId('map')).toBeTruthy()
})
it('desktop split falls back on narrowing, but an explicitly chosen list stays a list', () => {
  Object.assign(media, { matches: false })
  render(h(LibrariesMapView))
  expect(screen.getByRole('button', { name: '분할' }).getAttribute('aria-pressed')).toBe('true')
  act(() => {
    Object.assign(media, { matches: true })
    media.dispatchEvent(new Event('change'))
  })
  expect(screen.getByRole('button', { name: '지도' }).getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: '목록' }))
  act(() => {
    Object.assign(media, { matches: false })
    media.dispatchEvent(new Event('change'))
    Object.assign(media, { matches: true })
    media.dispatchEvent(new Event('change'))
  })
  expect(screen.getByRole('button', { name: '목록' }).getAttribute('aria-pressed')).toBe('true')
})
