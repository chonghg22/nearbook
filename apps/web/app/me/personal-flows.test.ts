// @vitest-environment jsdom
import { createElement as h, StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { WishlistView } from './wishlist/_components/wishlist-view'
import { LibraryCardsView } from './libraries/_components/library-cards-view'
import { WishlistButton } from '@/components/book/wishlist-button'
import { LibraryFavoriteButton } from '@/components/library/library-favorite-button'
import { DefaultHolding } from './wishlist/_components/default-holding'
import { SavedLibrarySearch } from '@/components/me/saved-library-search'

const mocked = vi.hoisted(() => ({
  api: vi.fn(),
  listeners: [] as Array<(event: string, session: { user: { id: string } } | null) => void>,
}))
vi.mock('@/lib/api-client', () => ({ personalApiFetch: mocked.api }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: (listener: (typeof mocked.listeners)[number]) => {
        mocked.listeners.push(listener)
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                mocked.listeners = mocked.listeners.filter((item) => item !== listener)
              },
            },
          },
        }
      },
    },
  }),
}))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))
vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => h('img', { alt }) }))
const book = {
  isbn: '9788936434120',
  title: '소년이 온다',
  author: '한강',
  coverUrl: null,
  addedAt: '2026-10-15T00:00:00Z',
  note: null,
}
const card = {
  id: 1,
  libraryId: 111314,
  nickname: null,
  isDefault: true,
  library: {
    name: '서울도서관',
    address: '서울 중구',
    lat: 37.56,
    lng: 126.97,
    homepage: 'https://lib.seoul.go.kr/',
  },
}
let books = [book]
let cards = [card]
let added = false
const fetchMock = vi.fn<typeof fetch>()
function list<T>(data: T[], plan = 'free') {
  return Response.json({ data, meta: { total: data.length, plan } })
}
function holding(
  status: 'available' | 'borrowed' | 'unknown' | 'not_held' = 'available',
  stale = false,
  libraryId = 111314
) {
  const stamp = new Date(Date.now() - (stale ? 360_000 : 0)).toISOString()
  const known = status !== 'unknown',
    held = status === 'available' || status === 'borrowed'
  return {
    libraries: [
      {
        id: libraryId,
        name: '서울도서관',
        homepage: card.library.homepage,
        lat: 37.56,
        lng: 126.97,
        status,
        hasBook: known ? held : null,
        loanAvailable: known ? status === 'available' : null,
        stale,
        checkedAt: known ? stamp : null,
        lastAttemptAt: stamp,
        source: 'jeongbonaru:bookExist',
      },
    ],
    holdings: {
      source: 'jeongbonaru:bookExist',
      nearbyCount: 1,
      attemptedCount: 1,
      checkedCount: known ? 1 : 0,
      heldCount: held ? 1 : 0,
      availableCount: status === 'available' ? 1 : 0,
      borrowedCount: status === 'borrowed' ? 1 : 0,
      notHeldCount: status === 'not_held' ? 1 : 0,
      unknownCount: known ? 0 : 1,
      uncheckedCount: 0,
      limited: false,
    },
  }
}
beforeEach(() => {
  mocked.api.mockReset()
  mocked.listeners = []
  fetchMock.mockReset()
  books = [book]
  cards = [card]
  added = false
  vi.stubGlobal('fetch', fetchMock)
  mocked.api.mockImplementation(async (path: string, options: RequestInit = {}) => {
    if (options.method === 'DELETE') {
      books = []
      return new Response(null, { status: 204 })
    }
    if (path.endsWith('/status')) return Response.json({ data: { added } })
    if (path.includes('/holdings?')) return Response.json(holding())
    if (path === '/me/wishlists') return list(books)
    if (path === '/me/library-cards') return list(cards)
    if (path === '/wishlists' && options.method === 'POST') {
      added = true
      return Response.json({ data: { id: 1, isbn: book.isbn } })
    }
    throw new Error('Unexpected test request')
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
const writes = () =>
  mocked.api.mock.calls.filter(([, options]) => options?.method && options.method !== 'GET')
async function loadedWishlist() {
  render(h(WishlistView))
  return screen.findByRole('button', { name: '기본 도서관에서 보유 확인' })
}

it('StrictMode replay retains a usable account boundary without sending an aborted mutation', async () => {
  render(h(StrictMode, null, h(WishlistView)))
  const button = await screen.findByRole('button', { name: /위시리스트에서 제거/ })
  fireEvent.click(button)
  expect(await screen.findByText('아직 위시리스트가 비어 있습니다.')).toBeTruthy()
  expect((writes()[0]![1].signal as AbortSignal).aborted).toBe(false)
})
it('wishlist boot is private reads only, with an explicit default-library next step and no bulk holdings', async () => {
  await loadedWishlist()
  expect(screen.getByText('보유 조회 기준: 서울도서관')).toBeTruthy()
  expect(screen.getByRole('link', { name: '기본 도서관 선택·변경' }).getAttribute('href')).toBe(
    '/me/libraries'
  )
  expect(mocked.api.mock.calls.some(([path]) => path.includes('holdings'))).toBe(false)
  expect(writes()).toHaveLength(0)
})
it('one explicit click queries one ISBN/owned default library, with no nearby coordinates or fan-out', async () => {
  fireEvent.click(await loadedWishlist())
  expect(await screen.findByText('대출 가능')).toBeTruthy()
  expect(
    mocked.api.mock.calls.filter(([path]) => path.includes('/holdings?')).map(([path]) => path)
  ).toEqual([`/me/wishlists/${book.isbn}/holdings?libraryId=111314`])
  expect(screen.getByRole('link', { name: /공식 사이트에서 확인/ }).getAttribute('href')).toBe(
    'https://lib.seoul.go.kr/'
  )
  expect(screen.queryByText(/기준점에서/)).toBeNull()
  expect(writes()).toHaveLength(0)
})
it.each(['borrowed', 'not_held', 'unknown'] as const)(
  'retains honest %s observations and recovery links',
  async (status) => {
    mocked.api.mockImplementation(async (path) =>
      path.includes('/holdings?')
        ? Response.json(holding(status))
        : path === '/me/wishlists'
          ? list(books)
          : list(cards)
    )
    fireEvent.click(await loadedWishlist())
    expect(
      (
        await screen.findAllByText(
          status === 'borrowed' ? '대출 불가' : status === 'not_held' ? '미소장' : '확인 불가'
        )
      ).length
    ).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /공식 사이트에서 확인/ })).toBeTruthy()
  }
)
it('stale status keeps timestamps and a clear previous-info warning without automatic requests', async () => {
  mocked.api.mockImplementation(async () => Response.json(holding('available', true)))
  render(h(DefaultHolding, { isbn: book.isbn, card }))
  fireEvent.click(screen.getByRole('button', { name: '기본 도서관에서 보유 확인' }))
  expect(await screen.findByText(/이전 조회 정보/)).toBeTruthy()
  const before = mocked.api.mock.calls.length
  vi.useFakeTimers()
  act(() => {
    vi.advanceTimersByTime(120_000)
  })
  expect(mocked.api).toHaveBeenCalledTimes(before)
})
it('a holdings outage and wrong default ID never turn into book absence', async () => {
  mocked.api
    .mockResolvedValueOnce(new Response('', { status: 503 }))
    .mockResolvedValueOnce(Response.json(holding('available', false, 999)))
  render(h(DefaultHolding, { isbn: book.isbn, card }))
  fireEvent.click(screen.getByRole('button'))
  expect((await screen.findByRole('alert')).textContent).toContain('책이 없다는 뜻은 아닙니다')
  fireEvent.click(screen.getByRole('button'))
  await waitFor(() =>
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false)
  )
  expect(screen.queryByText('대출 가능')).toBeNull()
})
it('late old-default response is aborted/ignored and a new default requires a new explicit click', async () => {
  let finish!: (response: Response) => void
  mocked.api.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const view = render(h(DefaultHolding, { isbn: book.isbn, card }))
  fireEvent.click(screen.getByRole('button'))
  fireEvent.click(screen.getByRole('button'))
  expect(mocked.api).toHaveBeenCalledOnce()
  const signal = mocked.api.mock.calls[0]![1].signal as AbortSignal
  view.rerender(h(DefaultHolding, { isbn: book.isbn, card: { ...card, libraryId: 111315 } }))
  expect(signal.aborted).toBe(true)
  await act(async () => {
    finish(Response.json(holding()))
  })
  expect(screen.queryByText('대출 가능')).toBeNull()
  expect(mocked.api).toHaveBeenCalledOnce()
})
it('load failure is not an empty wishlist, and retry can recover existing data', async () => {
  const base = mocked.api.getMockImplementation()!
  mocked.api.mockImplementation(async (path, options) =>
    path === '/me/wishlists' ? new Response('', { status: 503 }) : base(path, options)
  )
  render(h(WishlistView))
  expect((await screen.findByRole('alert')).textContent).toContain('목록이 비었다는 뜻은 아닙니다')
  expect(screen.queryByText('아직 위시리스트가 비어 있습니다.')).toBeNull()
  mocked.api.mockImplementation(base)
  fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
  expect(await screen.findByRole('button', { name: '기본 도서관에서 보유 확인' })).toBeTruthy()
})
it('no default retains the wishlist and offers setup instead of auto-selecting or querying GPS', async () => {
  cards = []
  render(h(WishlistView))
  expect(await screen.findByText(/기본 도서관을 선택해/)).toBeTruthy()
  await screen.findByRole('button', { name: /위시리스트에서 제거/ })
  expect(screen.queryByRole('button', { name: '기본 도서관에서 보유 확인' })).toBeNull()
  expect(writes()).toHaveLength(0)
})
it('delete is deduplicated and failed/uncertain removal preserves data until a status reload', async () => {
  let finish!: (response: Response) => void
  const base = mocked.api.getMockImplementation()!
  mocked.api.mockImplementation((path, options) =>
    options?.method === 'DELETE'
      ? new Promise((done) => {
          finish = done
        })
      : base(path, options)
  )
  await loadedWishlist()
  const button = screen.getByRole('button', { name: /위시리스트에서 제거/ })
  fireEvent.click(button)
  fireEvent.click(button)
  expect(writes()).toHaveLength(1)
  await act(async () => {
    finish(new Response('', { status: 503 }))
  })
  expect(screen.getByRole('link', { name: '소년이 온다' })).toBeTruthy()
  expect((button as HTMLButtonElement).disabled).toBe(true)
  mocked.api.mockImplementation(base)
  fireEvent.click(screen.getByRole('button', { name: '상태 다시 불러오기' }))
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: /위시리스트에서 제거/ }) as HTMLButtonElement).disabled
    ).toBe(false)
  )
})
it('a successful removal uses the refreshed server list, not a stale counter', async () => {
  await loadedWishlist()
  fireEvent.click(screen.getByRole('button', { name: /위시리스트에서 제거/ }))
  expect(await screen.findByText('아직 위시리스트가 비어 있습니다.')).toBeTruthy()
  expect(screen.getByText('0 / 10권')).toBeTruthy()
})
it('logout hides private data, aborts pending reads and unsubscribes on unmount', async () => {
  const view = render(h(WishlistView))
  await screen.findByRole('button', { name: '기본 도서관에서 보유 확인' })
  act(() => {
    for (const listener of [...mocked.listeners]) listener('SIGNED_OUT', null)
  })
  expect(screen.queryByRole('button', { name: '기본 도서관에서 보유 확인' })).toBeNull()
  expect(screen.queryByText('소년이 온다')).toBeNull()
  view.unmount()
  expect(mocked.listeners).toHaveLength(0)
})
it('an account boundary aborts an in-flight mutation and ignores its late success', async () => {
  let finish!: (response: Response) => void
  const base = mocked.api.getMockImplementation()!
  mocked.api.mockImplementation((path, options) =>
    options?.method === 'DELETE'
      ? new Promise((done) => {
          finish = done
        })
      : base(path, options)
  )
  await loadedWishlist()
  act(() => {
    for (const listener of [...mocked.listeners])
      listener('INITIAL_SESSION', { user: { id: 'account-a' } })
  })
  fireEvent.click(screen.getByRole('button', { name: /위시리스트에서 제거/ }))
  const signal = writes()[0]![1].signal as AbortSignal
  books = []
  cards = []
  act(() => {
    for (const listener of [...mocked.listeners])
      listener('SIGNED_IN', { user: { id: 'account-b' } })
  })
  expect(signal.aborted).toBe(true)
  expect(await screen.findByText('아직 위시리스트가 비어 있습니다.')).toBeTruthy()
  await act(async () => {
    finish(new Response(null, { status: 204 }))
  })
  expect(screen.queryByText('소년이 온다')).toBeNull()
})

it('an anonymous save widget offers a preserved return route without a private write', async () => {
  mocked.api.mockResolvedValue(new Response('', { status: 401 }))
  render(h(WishlistButton, { isbn: book.isbn }))
  const login = await screen.findByRole('link', { name: '로그인하고 찜하기' })
  expect(
    new URL(login.getAttribute('href')!, 'https://example.test').searchParams.get('next')
  ).toBe(`/book/${book.isbn}`)
  expect(writes()).toHaveLength(0)
})
it('save widget is initially disabled, deduplicates clicks, confirms saved state and then offers library setup', async () => {
  let finish!: (response: Response) => void
  const base = mocked.api.getMockImplementation()!
  mocked.api.mockImplementation((path, options) =>
    options?.method === 'POST'
      ? new Promise((done) => {
          finish = done
        })
      : base(path, options)
  )
  render(h(WishlistButton, { isbn: book.isbn }))
  expect(
    (screen.getByRole('button', { name: '위시리스트에 추가' }) as HTMLButtonElement).disabled
  ).toBe(true)
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: '위시리스트에 추가' }) as HTMLButtonElement).disabled
    ).toBe(false)
  )
  const button = screen.getByRole('button', { name: '위시리스트에 추가' })
  fireEvent.click(button)
  fireEvent.click(button)
  expect(writes()).toHaveLength(1)
  added = true
  await act(async () => {
    finish(Response.json({ data: { id: 1 } }))
  })
  expect(await screen.findByRole('link', { name: '기본 도서관 선택·확인' })).toBeTruthy()
  expect(
    screen.getByRole('button', { name: '위시리스트에서 제거' }).getAttribute('aria-pressed')
  ).toBe('true')
  expect(writes()[0]![0]).toBe('/wishlists')
  expect(mocked.api.mock.calls.filter(([path]) => path.endsWith('/status'))).toHaveLength(2)
})
it('a malformed initial save status is not false/permission to POST, but can be retried', async () => {
  mocked.api
    .mockResolvedValueOnce(Response.json({ data: { added: 'false' } }))
    .mockResolvedValueOnce(Response.json({ data: { added: false } }))
  render(h(WishlistButton, { isbn: book.isbn }))
  await screen.findByRole('alert')
  expect(
    (screen.getByRole('button', { name: '찜 상태 확인 필요' }) as HTMLButtonElement).disabled
  ).toBe(true)
  expect(
    screen.getByRole('button', { name: '찜 상태 확인 필요' }).hasAttribute('aria-pressed')
  ).toBe(false)
  expect(writes()).toHaveLength(0)
  fireEvent.click(screen.getByRole('button', { name: '찜 상태 다시 확인' }))
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: '위시리스트에 추가' }) as HTMLButtonElement).disabled
    ).toBe(false)
  )
})
it('successful-looking POST followed by unchanged state is not reported as a successful save', async () => {
  const base = mocked.api.getMockImplementation()!
  mocked.api.mockImplementation((path, options) =>
    options?.method === 'POST'
      ? Promise.resolve(Response.json({ data: null }))
      : base(path, options)
  )
  render(h(WishlistButton, { isbn: book.isbn }))
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: '위시리스트에 추가' }) as HTMLButtonElement).disabled
    ).toBe(false)
  )
  fireEvent.click(screen.getByRole('button', { name: '위시리스트에 추가' }))
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.queryByText('위시리스트에 추가했습니다.')).toBeNull()
})
it('save limit errors preserve policy and require status confirmation before retrying', async () => {
  const base = mocked.api.getMockImplementation()!
  mocked.api.mockImplementation((path, options) =>
    options?.method === 'POST'
      ? Promise.resolve(new Response('', { status: 403 }))
      : base(path, options)
  )
  render(h(WishlistButton, { isbn: book.isbn }))
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: '위시리스트에 추가' }) as HTMLButtonElement).disabled
    ).toBe(false)
  )
  fireEvent.click(screen.getByRole('button', { name: '위시리스트에 추가' }))
  expect((await screen.findByRole('alert')).textContent).toContain('등록 한도')
  expect(screen.queryByRole('status')).toBeNull()
  expect(
    (screen.getByRole('button', { name: '찜 상태 확인 필요' }) as HTMLButtonElement).disabled
  ).toBe(true)
})
it('library detail widget reads registration status rather than trusting a default false prop', async () => {
  added = true
  render(h(LibraryFavoriteButton, { libraryId: 111314 }))
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: '즐겨찾기 도서관에서 제거' }).getAttribute('aria-pressed')
    ).toBe('true')
  )
  expect(mocked.api.mock.calls[0]![0]).toBe('/me/library-cards/111314/status')
  expect(writes()).toHaveLength(0)
})
it('switching book while a status read is pending aborts and ignores the old-book result', async () => {
  let finish!: (response: Response) => void
  mocked.api
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done
        })
    )
    .mockResolvedValue(Response.json({ data: { added: false } }))
  const view = render(h(WishlistButton, { isbn: book.isbn }))
  const signal = mocked.api.mock.calls[0]![1].signal as AbortSignal
  view.rerender(h(WishlistButton, { isbn: '9788936434410' }))
  expect(signal.aborted).toBe(true)
  await act(async () => {
    finish(Response.json({ data: { added: true } }))
  })
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: '위시리스트에 추가' }).getAttribute('aria-pressed')
    ).toBe('false')
  )
})
it('the actual library management view reports failures, with no automatic default or account mutation', async () => {
  cards = []
  render(h(LibraryCardsView))
  expect(await screen.findByText(/등록한 도서관이 없습니다/)).toBeTruthy()
  expect(writes()).toHaveLength(0)
  expect(screen.getByRole('search', { name: '등록할 도서관 검색' })).toBeTruthy()
  expect(
    screen.getByRole('link', { name: '찜한 책 보유 확인하러 가기' }).getAttribute('href')
  ).toBe('/me/wishlist')
})
it('a library load error is not an empty collection or permission to register', async () => {
  mocked.api.mockResolvedValue(new Response('', { status: 503 }))
  render(h(LibraryCardsView))
  await screen.findByRole('alert')
  expect(screen.queryByText(/등록한 도서관이 없습니다/)).toBeNull()
  expect(
    (screen.getByRole('textbox', { name: '등록할 도서관 이름' }) as HTMLInputElement).disabled
  ).toBe(true)
})
it('default save is deduplicated, preserves failed settings, and only becomes current after re-read', async () => {
  cards = [{ ...card, isDefault: false }]
  let finish!: (response: Response) => void
  const base = mocked.api.getMockImplementation()!
  mocked.api.mockImplementation((path, options) =>
    options?.method === 'PATCH'
      ? new Promise((done) => {
          finish = done
        })
      : base(path, options)
  )
  render(h(LibraryCardsView))
  const select = await screen.findByRole('button', { name: '기본 도서관으로 선택' })
  fireEvent.click(select)
  fireEvent.click(select)
  expect(writes()).toHaveLength(1)
  expect(JSON.parse(writes()[0]![1].body)).toEqual({ isDefault: true })
  await act(async () => {
    finish(new Response('', { status: 503 }))
  })
  expect(screen.queryByRole('button', { name: '현재 기본 도서관' })).toBeNull()
  expect((select as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: '상태 다시 불러오기' }))
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: '기본 도서관으로 선택' }) as HTMLButtonElement).disabled
    ).toBe(false)
  )
  fireEvent.click(screen.getByRole('button', { name: '기본 도서관으로 선택' }))
  cards = [card]
  await act(async () => {
    finish(Response.json({ data: { id: 1, libraryId: 111314, isDefault: true } }))
  })
  expect(await screen.findByRole('button', { name: '현재 기본 도서관' })).toBeTruthy()
})
it('library public search neither saves settings nor opens camera/GPS and registration is explicit', async () => {
  const add = vi.fn()
  fetchMock.mockResolvedValue(
    Response.json({
      data: [
        {
          id: 111314,
          name: '서울도서관',
          address: '서울 중구',
          region: '서울',
          lat: 37.56,
          lng: 126.97,
        },
      ],
    })
  )
  render(h(SavedLibrarySearch, { disabled: false, onAdd: add }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '서울' } })
  expect(fetchMock).not.toHaveBeenCalled()
  fireEvent.submit(screen.getByRole('search'))
  fireEvent.click(await screen.findByRole('button', { name: '서울도서관 내 도서관에 등록' }))
  expect(add).toHaveBeenCalledExactlyOnceWith(111314)
  expect(writes()).toHaveLength(0)
})
it('authenticated mocked default registration → wishlist → one-library status flow preserves free policy', async () => {
  cards = []
  books = []
  added = false
  const base = mocked.api.getMockImplementation()!
  mocked.api.mockImplementation(async (path, options) => {
    if (path === '/library-cards' && options?.method === 'POST') {
      cards = [card]
      return Response.json({ data: { id: 1, libraryId: 111314, isDefault: true } })
    }
    if (path === '/wishlists' && options?.method === 'POST') {
      books = [book]
      added = true
      return Response.json({ data: { id: 1, isbn: book.isbn } })
    }
    return base(path, options)
  })
  fetchMock.mockResolvedValue(
    Response.json({
      data: [
        {
          id: 111314,
          name: '서울도서관',
          address: '서울 중구',
          region: '서울',
          lat: 37.56,
          lng: 126.97,
        },
      ],
    })
  )
  let view = render(h(LibraryCardsView))
  await screen.findByText(/등록한 도서관이 없습니다/)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '서울' } })
  fireEvent.submit(screen.getByRole('search'))
  fireEvent.click(await screen.findByRole('button', { name: '서울도서관 내 도서관에 등록' }))
  await screen.findByRole('button', { name: '현재 기본 도서관' })
  view.unmount()
  view = render(h(WishlistButton, { isbn: book.isbn }))
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: '위시리스트에 추가' }) as HTMLButtonElement).disabled
    ).toBe(false)
  )
  fireEvent.click(screen.getByRole('button', { name: '위시리스트에 추가' }))
  await screen.findByRole('link', { name: '찜한 책 보유 확인' })
  view.unmount()
  render(h(WishlistView))
  fireEvent.click(await screen.findByRole('button', { name: '기본 도서관에서 보유 확인' }))
  expect(await screen.findByText('대출 가능')).toBeTruthy()
  expect(writes().map(([path]) => path)).toEqual(['/library-cards', '/wishlists'])
  expect(mocked.api.mock.calls.filter(([path]) => path.includes('/holdings?'))).toHaveLength(1)
})
