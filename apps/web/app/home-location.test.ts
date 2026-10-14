// @vitest-environment jsdom
import { createElement as h, type ReactNode } from 'react'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import { SWRConfig } from 'swr'
import { LocationProvider, useLocationContext } from '@/lib/use-location-context'
import { LocationBar } from '@/components/location-bar'
import { HeroSection } from './_components/hero-section'
import { LibrariesNearMe } from './_components/libraries-near-me'
import { LOCATION_STORAGE_KEY } from '@/lib/location-state'

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => h('img', { src, alt }),
}))
vi.mock('use-debounce', () => ({ useDebounce: (value: string) => [value] }))
vi.mock('@/components/maps/naver-interactive-map', () => ({
  NaverInteractiveMap: ({
    libraries,
    onBoundsChange,
  }: {
    libraries: Array<{ name: string }>
    onBoundsChange: (bounds: unknown) => void
  }) =>
    h(
      'div',
      { 'aria-label': '검증용 지도' },
      h(
        'button',
        { onClick: () => onBoundsChange({ swLat: 35, swLng: 129, neLat: 36, neLng: 130 }) },
        '지도 이동'
      ),
      libraries.map((lib) => lib.name).join(', ')
    ),
}))
const fetchMock = vi.fn<typeof fetch>()
const gpsMock = vi.fn<Geolocation['getCurrentPosition']>()
const library = {
  id: 111314,
  name: '서울도서관',
  address: '서울특별시 중구',
  region: '서울특별시 중구',
  lat: 37.56,
  lng: 126.97,
  distanceKm: 0,
}
let current: ReturnType<typeof useLocationContext>
function Probe() {
  current = useLocationContext()
  return h('div', { 'data-testid': 'location' }, JSON.stringify(current.location))
}
function mount(content: ReactNode = h(LocationBar, { showDescription: true })) {
  return render(
    h(
      SWRConfig,
      { value: { provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false } },
      h(LocationProvider, null, content, h(Probe))
    )
  )
}
async function openLocation() {
  fireEvent.click(screen.getByRole('button', { name: '지역·도서관 변경' }))
  return screen.findByRole('dialog', { name: '어느 지역 도서관을 볼까요?' })
}
beforeEach(() => {
  localStorage.clear()
  router.push.mockReset()
  gpsMock.mockReset()
  fetchMock.mockReset()
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: gpsMock },
  })
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockImplementation(async (url) =>
    Response.json({ data: String(url).includes('/search/') ? [] : [library] })
  )
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'geolocation')
})

it('first visit exposes a home search and desktop/mobile scan link without login or GPS', () => {
  mount(h(HeroSection, { monthlyKeywords: [] }))
  expect(screen.getByRole('search', { name: '홈 도서 검색' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'ISBN 바코드 스캔' }).getAttribute('href')).toBe('/scan')
  expect(screen.getByText('서울특별시')).toBeTruthy()
  expect(screen.getByRole('button', { name: '지역·도서관 변경' })).toBeTruthy()
  expect(gpsMock).not.toHaveBeenCalled()
})
it('home form submits a trimmed encoded query, but not blank input', () => {
  mount(h(HeroSection, { monthlyKeywords: [] }))
  const form = screen.getByRole('search', { name: '홈 도서 검색' })
  fireEvent.submit(form)
  expect(router.push).not.toHaveBeenCalled()
  fireEvent.change(within(form).getByRole('textbox'), { target: { value: ' 한강 & 책 ' } })
  fireEvent.submit(form)
  expect(router.push).toHaveBeenCalledWith(`/search?q=${encodeURIComponent('한강 & 책')}`)
  expect(gpsMock).not.toHaveBeenCalled()
})
it('a visitor changes region manually and it survives reload without requesting GPS', async () => {
  const rendered = mount()
  const dialog = await openLocation()
  fireEvent.click(within(dialog).getByRole('button', { name: '부산광역시' }))
  fireEvent.click(within(dialog).getByRole('button', { name: '부산 중심' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(current.location).toMatchObject({
    mode: 'region',
    regionSlug: 'busan',
    label: '부산광역시',
  })
  rendered.unmount()
  mount()
  expect(current.location).toMatchObject({ mode: 'region', regionSlug: 'busan' })
  expect(gpsMock).not.toHaveBeenCalled()
})
it('GPS denial retains the previous region and exposes a direct manual fallback', async () => {
  gpsMock.mockImplementation((_ok, fail) => fail?.({ code: 1 } as GeolocationPositionError))
  mount()
  const dialog = await openLocation()
  fireEvent.click(within(dialog).getByRole('button', { name: '현재 위치' }))
  fireEvent.click(within(dialog).getByRole('button', { name: '내 위치로 검색' }))
  expect(await within(dialog).findByRole('alert')).toBeTruthy()
  expect(current.location.mode).toBe('region')
  fireEvent.click(within(dialog).getByRole('button', { name: 'GPS 없이 지역 직접 선택' }))
  fireEvent.click(within(dialog).getByRole('button', { name: '강남구' }))
  await waitFor(() => expect(current.location.label).toBe('서울특별시 강남구'))
})
it('unsupported GPS keeps manual selection available without requesting permission', async () => {
  Reflect.deleteProperty(navigator, 'geolocation')
  mount()
  const dialog = await openLocation()
  fireEvent.click(within(dialog).getByRole('button', { name: '현재 위치' }))
  fireEvent.click(within(dialog).getByRole('button', { name: '내 위치로 검색' }))
  expect((await within(dialog).findByRole('alert')).textContent).toContain(
    'GPS를 사용할 수 없습니다'
  )
  fireEvent.click(within(dialog).getByRole('button', { name: 'GPS 없이 지역 직접 선택' }))
  fireEvent.click(within(dialog).getByRole('button', { name: '강남구' }))
  await waitFor(() => expect(current.location.mode).toBe('region'))
  expect(gpsMock).not.toHaveBeenCalled()
})
it('closing the dialog prevents a late GPS callback from changing the reference', async () => {
  let success!: PositionCallback
  gpsMock.mockImplementation((ok) => {
    success = ok
  })
  mount()
  const dialog = await openLocation()
  fireEvent.click(within(dialog).getByRole('button', { name: '현재 위치' }))
  fireEvent.click(within(dialog).getByRole('button', { name: '내 위치로 검색' }))
  fireEvent.click(within(dialog).getByRole('button', { name: '기준 위치 선택 닫기' }))
  await act(async () =>
    success({ coords: { latitude: 35, longitude: 129 } } as GeolocationPosition)
  )
  expect(current.location.mode).toBe('region')
})
it('manual region choice wins over an already pending GPS request', async () => {
  let success!: PositionCallback
  gpsMock.mockImplementation((ok) => {
    success = ok
  })
  mount()
  let result!: Promise<unknown>
  act(() => {
    result = current.requestGps().catch((error) => error)
    current.selectRegion('busan')
  })
  await act(async () =>
    success({ coords: { latitude: 37.5, longitude: 127 } } as GeolocationPosition)
  )
  expect(await result).toMatchObject({ kind: 'cancelled' })
  expect(current.location).toMatchObject({ mode: 'region', regionSlug: 'busan' })
})
it('GPS success is explicit and its restored value is called saved rather than current', async () => {
  gpsMock.mockImplementation((ok) =>
    ok({ coords: { latitude: 37.5, longitude: 127 } } as GeolocationPosition)
  )
  const rendered = mount()
  const dialog = await openLocation()
  fireEvent.click(within(dialog).getByRole('button', { name: '현재 위치' }))
  fireEvent.click(within(dialog).getByRole('button', { name: '내 위치로 검색' }))
  await waitFor(() =>
    expect(current.location).toMatchObject({ mode: 'gps', label: '현재 GPS 위치' })
  )
  rendered.unmount()
  mount()
  expect(current.location).toMatchObject({ mode: 'gps', label: '저장된 GPS 위치', isSaved: true })
  expect(gpsMock).toHaveBeenCalledTimes(1)
})
it('searches and selects a library without GPS; closed modal never fetches library search', async () => {
  mount()
  expect(fetchMock).not.toHaveBeenCalled()
  const dialog = await openLocation()
  fireEvent.click(within(dialog).getByRole('button', { name: '도서관 선택' }))
  fireEvent.change(within(dialog).getByRole('textbox', { name: '기준 도서관 이름 검색' }), {
    target: { value: '서울' },
  })
  fireEvent.click(await within(dialog).findByRole('button', { name: /서울도서관/ }))
  await waitFor(() => expect(current.location.mode).toBe('library'))
  expect(current.toSearchParams()).toEqual({ libraryId: '111314' })
  expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/^\/api\/libraries\?q=/)
  expect(gpsMock).not.toHaveBeenCalled()
})
it('invalid storage and blocked writes do not prevent manual selection', async () => {
  localStorage.setItem(LOCATION_STORAGE_KEY, 'invalid')
  mount()
  expect(current.location.mode).toBe('region')
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  act(() => current.selectRegion('busan'))
  expect(current.location).toMatchObject({ regionSlug: 'busan' })
})
it('blocked storage reads still render the default reference and change control', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  mount()
  expect(current.isLoaded).toBe(true)
  expect(screen.getByText('서울특별시')).toBeTruthy()
  expect(
    (screen.getByRole('button', { name: '지역·도서관 변경' }) as HTMLButtonElement).disabled
  ).toBe(false)
})
it('the location dialog traps keyboard focus instead of tabbing into the page behind it', async () => {
  mount()
  const dialog = await openLocation()
  const buttons = within(dialog).getAllByRole('button')
  const last = buttons[buttons.length - 1]!
  last.focus()
  fireEvent.keyDown(last, { key: 'Tab' })
  expect(document.activeElement).toBe(
    within(dialog).getByRole('button', { name: '기준 위치 선택 닫기' })
  )
})
it('Escape closes the dialog and returns focus to the change button', async () => {
  mount()
  const button = screen.getByRole('button', { name: '지역·도서관 변경' })
  button.focus()
  const dialog = await openLocation()
  fireEvent.keyDown(dialog, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await waitFor(() => expect(document.activeElement).toBe(button))
})
it('home list uses the manual reference, including zero distance, independent of map panning', async () => {
  mount(h(LibrariesNearMe))
  expect(await screen.findByRole('link', { name: /서울도서관/ })).toBeTruthy()
  expect(screen.getByText('기준점에서 0.0km')).toBeTruthy()
  const count = fetchMock.mock.calls.length
  fireEvent.click(screen.getByRole('button', { name: '지도 이동' }))
  expect(fetchMock).toHaveBeenCalledTimes(count)
  expect(gpsMock).not.toHaveBeenCalled()
})
it('a delayed previous-region response never appears under the new reference', async () => {
  let resolveOld!: (value: Response) => void
  fetchMock.mockImplementation((url) =>
    String(url).includes('lat=37.5665')
      ? new Promise((resolve) => {
          resolveOld = resolve
        })
      : Promise.resolve(
          Response.json({
            data: [{ ...library, id: 2, name: '부산도서관', lat: 35.18, lng: 129.07 }],
          })
        )
  )
  mount(h(LibrariesNearMe))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  act(() => current.selectRegion('busan'))
  expect(await screen.findByRole('link', { name: /부산도서관/ })).toBeTruthy()
  await act(async () => resolveOld(Response.json({ data: [library] })))
  expect(screen.queryByRole('link', { name: /서울도서관/ })).toBeNull()
  expect(screen.getByText('부산광역시')).toBeTruthy()
})
it('empty near list is not replaced by unrelated popular libraries or a permanent spinner', async () => {
  fetchMock.mockImplementation(async () => Response.json({ data: [] }))
  mount(h(LibrariesNearMe))
  expect(await screen.findByText('기준 좌표 반경 5km 안에 등록된 도서관이 없습니다.')).toBeTruthy()
  expect(screen.queryByRole('status')).toBeNull()
})
it('failed near list is an error with manual retry, never a normal empty result', async () => {
  fetchMock.mockImplementation(async () => new Response('', { status: 503 }))
  mount(h(LibrariesNearMe))
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.queryByText('기준 좌표 반경 5km 안에 등록된 도서관이 없습니다.')).toBeNull()
  fetchMock.mockImplementation(async () => Response.json({ data: [library] }))
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
  expect(await screen.findByRole('link', { name: /서울도서관/ })).toBeTruthy()
})
