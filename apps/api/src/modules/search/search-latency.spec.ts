import { Logger, ServiceUnavailableException } from '@nestjs/common'
import { SearchService } from './search.service'
import { db } from '@nearbook/db'
import type { LRUCache } from 'lru-cache'

jest.mock('@nearbook/db', () => ({
  db: { insert: jest.fn(), query: { searchStats: { findFirst: jest.fn() } } },
  searchLogs: {}, sql: jest.fn(),
}))
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const book = { isbn: '9788936434120', title: '소년이 온다' }
type Internals = {
  cache: LRUCache<string, object>
  enrichmentState: LRUCache<string, object>
  enrichmentInFlight: Map<string, Promise<void>>
}
describe('local-first search and bounded enrichment', () => {
  const orama = { query: jest.fn(), upsertMany: jest.fn(), revision: 0 }
  const naru = { searchAndCacheBooks: jest.fn(), getBookByIsbn: jest.fn() }
  const aladdin = { searchAndCache: jest.fn() }
  let service: SearchService
  let internals: Internals
  const settle = () => Promise.all(internals.enrichmentInFlight.values())
  const useFakeClock = () => {
    jest.useFakeTimers({ now: 1_000_000 })
    // lru-cache retains the original performance object across fake-timer swaps.
    jest.spyOn(internals.cache.perf, 'now').mockImplementation(() => Date.now())
  }
  beforeEach(() => {
    jest.resetAllMocks()
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
    orama.revision = 0
    orama.query.mockResolvedValue({ hits: [book], total: 1 })
    orama.upsertMany.mockImplementation(async () => { orama.revision++ })
    naru.searchAndCacheBooks.mockResolvedValue({ items: [], total: 10000 })
    naru.getBookByIsbn.mockResolvedValue(null)
    aladdin.searchAndCache.mockResolvedValue([])
    ;(db.insert as jest.Mock).mockReturnValue({ values: () => Promise.resolve({}) })
    service = new SearchService(orama as never, aladdin as never, naru as never)
    internals = service as unknown as Internals
  })
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

  it('returns indexed books while the external request remains unresolved', async () => {
    const remote = deferred<{ items: never[]; total: number }>()
    naru.searchAndCacheBooks.mockReturnValue(remote.promise)
    expect(await service.search({ q: '소년이 온다' })).toMatchObject({ items: [book], total: 1, enrichmentPending: false })
    expect(internals.enrichmentInFlight.size).toBe(1)
    expect(db.query.searchStats.findFirst).not.toHaveBeenCalled()
    remote.reject(new Error('timeout'))
    await settle()
    expect((await service.search({ q: '소년이 온다' })).items).toEqual([book])
  })
  it('remote totals never create extra local pages, including when smaller than local count', async () => {
    orama.query.mockResolvedValue({ hits: [book], total: 21 })
    naru.searchAndCacheBooks.mockResolvedValue({ items: [], total: 2 })
    expect((await service.search({ q: '제목' })).total).toBe(21)
    await settle()
    expect((await service.search({ q: '제목' })).total).toBe(21)
    expect(naru.searchAndCacheBooks).toHaveBeenCalledTimes(1)
  })
  it('simultaneous pages, sorts and sizes share a single provider first page', async () => {
    const remote = deferred<{ items: never[]; total: number }>()
    naru.searchAndCacheBooks.mockReturnValue(remote.promise)
    await Promise.all([
      service.search({ q: '제목', page: 1 }),
      service.search({ q: '제목', page: 2 }),
      service.search({ q: '제목', page: 99, pageSize: 50, sort: 'recent' }),
    ])
    expect(naru.searchAndCacheBooks).toHaveBeenCalledTimes(1)
    expect(naru.searchAndCacheBooks).toHaveBeenCalledWith('제목', 1, 60, 'all')
    expect(aladdin.searchAndCache).toHaveBeenCalledTimes(1)
    remote.resolve({ items: [], total: 1 })
    await settle()
  })
  it('canonical ISBN requests coalesce without title-provider fallback', async () => {
    orama.query.mockResolvedValue({ hits: [], total: 0 })
    const remote = deferred<typeof book | null>()
    naru.getBookByIsbn.mockReturnValue(remote.promise)
    const results = await Promise.all([service.search({ q: '8936434128' }), service.search({ q: '978-89-364-3412-0' })])
    expect(results.every(r => r.enrichmentPending && r.total === 0)).toBe(true)
    expect(naru.getBookByIsbn).toHaveBeenCalledTimes(1)
    expect(aladdin.searchAndCache).not.toHaveBeenCalled()
    remote.resolve(book)
    await settle()
    expect(orama.upsertMany).toHaveBeenCalledWith([book])
  })
  it('cold empty requests are pending, then return newly indexed items and the same-set count', async () => {
    orama.query.mockResolvedValue({ hits: [], total: 0 })
    const remote = deferred<{ items: typeof book[]; total: number }>()
    naru.searchAndCacheBooks.mockReturnValue(remote.promise)
    expect(await service.search({ q: '새로운 제목' })).toMatchObject({ items: [], total: 0, enrichmentPending: true })
    expect(internals.cache.size).toBe(0)
    remote.resolve({ items: [book], total: 999 })
    await settle()
    orama.query.mockResolvedValue({ hits: [book], total: 1 })
    expect(await service.search({ q: '새로운 제목' })).toMatchObject({ items: [book], total: 1, enrichmentPending: false })
  })
  it('a failed cold lookup is not declared a verified absence; retries are throttled for 30s', async () => {
    useFakeClock()
    orama.query.mockResolvedValue({ hits: [], total: 0 })
    naru.searchAndCacheBooks.mockRejectedValue(new Error('SECRET timeout'))
    await service.search({ q: '없는 제목' })
    await settle()
    expect(await service.search({ q: '없는 제목' })).toMatchObject({ total: 0, enrichmentPending: false, enrichmentFailed: true })
    expect(naru.searchAndCacheBooks).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(30_001)
    naru.searchAndCacheBooks.mockResolvedValue({ items: [], total: 0 })
    expect((await service.search({ q: '없는 제목' })).enrichmentPending).toBe(true)
    await settle()
    expect(await service.search({ q: '없는 제목' })).toMatchObject({ total: 0, enrichmentPending: false, enrichmentFailed: false })
    expect(naru.searchAndCacheBooks).toHaveBeenCalledTimes(2)
  })
  it('successful empty enrichment is held for an hour, not retriggered by every poll', async () => {
    useFakeClock()
    orama.query.mockResolvedValue({ hits: [], total: 0 })
    await service.search({ q: '미소장 제목' })
    await settle()
    jest.advanceTimersByTime(61_000)
    expect((await service.search({ q: '미소장 제목' })).enrichmentPending).toBe(false)
    expect(naru.searchAndCacheBooks).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(3600_001)
    await service.search({ q: '미소장 제목' })
    await settle()
    expect(naru.searchAndCacheBooks).toHaveBeenCalledTimes(2)
  })
  it('index mutations invalidate previously cached results for other queries too', async () => {
    await service.search({ q: 'x' })
    await service.search({ q: 'x' })
    expect(orama.query).toHaveBeenCalledTimes(1)
    orama.revision++
    orama.query.mockResolvedValue({ hits: [book], total: 2 })
    expect((await service.search({ q: 'x' })).total).toBe(2)
    expect(orama.query).toHaveBeenCalledTimes(2)
  })
  it('a revision change during a query prevents caching its earlier snapshot', async () => {
    const local = deferred<{ hits: typeof book[]; total: number }>()
    orama.query.mockReturnValueOnce(local.promise)
    const request = service.search({ q: 'x' })
    orama.revision++
    local.resolve({ hits: [book], total: 1 })
    await request
    expect(internals.cache.size).toBe(0)
  })
  it('at most 16 enrichment jobs run; overload remains pending and can retry later', async () => {
    orama.query.mockResolvedValue({ hits: [], total: 0 })
    const remote = deferred<{ items: never[]; total: number }>()
    naru.searchAndCacheBooks.mockReturnValue(remote.promise)
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => service.search({ q: `제목${i}` })))
    expect(naru.searchAndCacheBooks).toHaveBeenCalledTimes(16)
    expect(internals.enrichmentInFlight.size).toBe(16)
    expect(results.every(r => r.enrichmentPending)).toBe(true)
    remote.resolve({ items: [], total: 0 })
    await settle()
    await service.search({ q: '제목19' })
    await settle()
    expect(naru.searchAndCacheBooks).toHaveBeenCalledTimes(17)
  })
  it('response cache has a 500-entry cap, purges expired entries and promotes reads', async () => {
    useFakeClock()
    // Single-character queries skip enrichment so this isolates the response cache.
    for (let i = 0; i < 500; i++) await service.search({ q: String.fromCodePoint(0x4e00 + i) })
    expect(internals.cache.size).toBe(500)
    await service.search({ q: String.fromCodePoint(0x4e00) })
    await service.search({ q: 'Z' })
    const calls = orama.query.mock.calls.length
    await service.search({ q: String.fromCodePoint(0x4e00) })
    expect(orama.query).toHaveBeenCalledTimes(calls)
    jest.advanceTimersByTime(60_001)
    await service.search({ q: 'Z' })
    expect(internals.cache.size).toBe(1)
  })
  it('cooldown state is bounded and expired entries are removed', async () => {
    useFakeClock()
    for (let i = 0; i < 510; i++) {
      await service.search({ q: `제목${i}` })
      await settle()
    }
    expect(internals.enrichmentState.size).toBe(500)
    jest.advanceTimersByTime(3600_001)
    await service.search({ q: 'x' })
    expect(internals.enrichmentState.size).toBe(0)
  })
  it('secondary provider rejection and index-upsert rejection do not become unhandled errors', async () => {
    aladdin.searchAndCache.mockRejectedValue(new Error('Aladdin failed'))
    naru.searchAndCacheBooks.mockResolvedValue({ items: [book], total: 1 })
    orama.upsertMany.mockRejectedValue(new Error('upsert failed'))
    expect((await service.search({ q: '제목' })).items).toEqual([book])
    await settle()
    expect(internals.enrichmentInFlight.size).toBe(0)
  })
  it('an index outage is still a sanitized 503 and is not cached', async () => {
    orama.query.mockRejectedValueOnce(new Error('SECRET index'))
    await expect(service.search({ q: '제목' })).rejects.toBeInstanceOf(ServiceUnavailableException)
    expect(internals.cache.size).toBe(0)
    expect(naru.searchAndCacheBooks).not.toHaveBeenCalled()
  })
})
