// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SWRConfig } from 'swr'
import { SearchPageInner } from './_components/search-page-inner'

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({ push: navigation.push }),
}))
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))
const fetchMock = vi.fn<typeof fetch>()
const items = [
  {
    isbn: '9788936434120',
    title: '소년이 온다',
    author: '지은이: 한강',
    publisher: '창비',
    coverUrl: null,
  },
  {
    isbn: '9788936434410',
    title: '소년이 온다 [큰글자책]',
    author: '한강 (지은이)',
    publisher: '창비',
    coverUrl: null,
  },
  {
    isbn: '9780000000019',
    title: '소년이 온다 필사책',
    author: null,
    publisher: null,
    coverUrl: null,
  },
]
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  navigation.push.mockReset()
  fetchMock.mockImplementation(async () =>
    Response.json({ data: { items, total: 3, page: 1, pageSize: 10 } })
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})
function mount(params: string) {
  navigation.params = new URLSearchParams(params)
  return render(
    createElement(
      SWRConfig,
      { value: { provider: () => new Map(), dedupingInterval: 0 } },
      createElement(SearchPageInner)
    )
  )
}
it('default discovery stays same-origin and uses a rollout-compatible omitted all type', async () => {
  mount('q=한강')
  await screen.findByRole('link', { name: /ISBN 9788936434120/ })
  expect((screen.getByRole('combobox', { name: '검색 유형' }) as HTMLSelectElement).value).toBe(
    'all'
  )
  const [url, init] = fetchMock.mock.calls[0]!
  expect(String(url)).toMatch(/^\/api\/search\?/)
  expect(new URL(String(url), 'https://example.test').searchParams.has('searchType')).toBe(false)
  expect(init?.credentials).toBe('same-origin')
})
it.each(['title', 'author', 'publisher'])(
  'selected %s goes to the actual API request',
  async (type) => {
    mount(`q=한강&searchType=${type}`)
    await screen.findByRole('link', { name: /ISBN 9788936434120/ })
    expect(
      new URL(String(fetchMock.mock.calls[0]?.[0]), 'https://example.test').searchParams.get(
        'searchType'
      )
    ).toBe(type)
  }
)
it.each(['8936434128', '978-89-364-3412-0'])(
  'detects %s and displays canonical ISBN and selector',
  async (q) => {
    mount(new URLSearchParams({ q }).toString())
    await screen.findByRole('link', { name: /ISBN 9788936434120/ })
    const sent = new URL(String(fetchMock.mock.calls[0]?.[0]), 'https://example.test').searchParams
    expect(sent.get('q')).toBe('9788936434120')
    expect(sent.get('searchType')).toBe('isbn')
    expect((screen.getByRole('combobox', { name: '검색 유형' }) as HTMLSelectElement).value).toBe(
      'isbn'
    )
    expect(screen.getByText(/ISBN을 감지해/).textContent).toContain('9788936434120')
  }
)
it.each(['q=9788936434121&searchType=isbn', 'q=9788936434121'])(
  'invalid ISBN %s shows input guidance without fetching or claiming zero results',
  (params) => {
    mount(params)
    expect(screen.getByRole('alert').textContent).toContain('체크 숫자가 유효한')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByText(/검색결과 0건/)).toBeNull()
  }
)
it('shows distinct ISBNs and title-evidence edition badges without inventing regular edition', async () => {
  mount('q=소년이+온다')
  await screen.findByRole('link', { name: /ISBN 9788936434120/ })
  expect(screen.getByText('큰글자 표기')).toBeDefined()
  expect(screen.getByText('필사 표기')).toBeDefined()
  expect(screen.queryByText('일반판')).toBeNull()
  expect(screen.getByText(/표기가 없는 책의 판본을 확정/)).toBeDefined()
  expect(screen.getByRole('link', { name: /ISBN 9788936434410/ }).getAttribute('href')).toBe(
    '/book/9788936434410'
  )
  expect(screen.getAllByTitle('지은이: 한강')[0]?.textContent).toBe('한강 · 창비')
})
it('filter navigation preserves query/type and resets the page before the next request', async () => {
  mount('q=한강&page=3')
  await screen.findByRole('link', { name: /ISBN 9788936434120/ })
  fireEvent.change(screen.getByRole('combobox', { name: '검색 유형' }), {
    target: { value: 'author' },
  })
  const target = new URL(navigation.push.mock.calls[0]?.[0], 'https://example.test')
  expect(target.searchParams.get('q')).toBe('한강')
  expect(target.searchParams.get('searchType')).toBe('author')
  expect(target.searchParams.get('page')).toBe('1')
})
it('automatic ISBN mode does not stick when submitting a new title query', async () => {
  mount('q=8936434128')
  await screen.findByRole('link', { name: /ISBN 9788936434120/ })
  fireEvent.change(screen.getByRole('textbox', { name: '검색어' }), {
    target: { value: '소년이 온다' },
  })
  fireEvent.submit(screen.getByRole('search'))
  const target = new URL(navigation.push.mock.calls[0]?.[0], 'https://example.test')
  expect(target.searchParams.get('q')).toBe('소년이 온다')
  expect(target.searchParams.has('searchType')).toBe(false)
})
it('new API failures are still errors, not a normal empty search', async () => {
  fetchMock.mockImplementation(async () => new Response('unavailable', { status: 503 }))
  mount('q=소년이+온다')
  expect((await screen.findByRole('alert')).textContent).toContain(
    '검색 결과가 없다는 뜻은 아닙니다'
  )
  expect(screen.queryByText('검색 결과가 없어요.')).toBeNull()
})
