import { BadRequestException, Logger, ServiceUnavailableException } from '@nestjs/common'
import { SearchService } from './search.service'
import { db } from '@nearbook/db'

jest.mock('@nearbook/db', () => ({
  db: { query: { searchStats: { findFirst: jest.fn() } }, execute: jest.fn(), insert: jest.fn(), select: jest.fn() },
  searchStats: { query: 'query', searchType: 'searchType' }, bookCache: { title: 'title' }, searchLogs: {},
  and: jest.fn(), eq: jest.fn(), ilike: jest.fn(), sql: jest.fn(),
}))

describe('search failures are not normal empty results', () => {
  const orama = { query: jest.fn(), upsertMany: jest.fn() }
  let service: SearchService
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
    service = new SearchService(orama as never, {} as never, {} as never)
    ;(db.query.searchStats.findFirst as jest.Mock).mockResolvedValue({ remoteTotal: 0 })
    ;(db.execute as jest.Mock).mockResolvedValue([])
    ;(db.insert as jest.Mock).mockReturnValue({ values: () => Promise.resolve({}) })
    ;(db.select as jest.Mock).mockReturnValue({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) })
  })
  afterEach(() => jest.restoreAllMocks())
  it('returns a legitimate empty successful search unchanged', async () => {
    orama.query.mockResolvedValue({ hits: [], total: 0 })
    expect(await service.search({ q: 'x' })).toMatchObject({ items: [], total: 0, page: 1, pageSize: 10 })
  })
  it('propagates index outage as sanitized 503, not items:[]', async () => {
    orama.query.mockRejectedValueOnce(new Error('SECRET database connection'))
    try { await service.search({ q: 'x' }); throw Error('expected failure') } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException)
      expect((error as ServiceUnavailableException).getStatus()).toBe(503)
      expect(JSON.stringify((error as ServiceUnavailableException).getResponse())).not.toContain('SECRET')
    }
  })
  it('a failed request is not cached; a later normal request recovers', async () => {
    orama.query.mockRejectedValueOnce(new Error('outage')).mockResolvedValueOnce({ hits: [], total: 0 })
    await expect(service.search({ q: 'x' })).rejects.toBeInstanceOf(ServiceUnavailableException)
    expect((await service.search({ q: 'x' })).items).toEqual([])
    expect(orama.query).toHaveBeenCalledTimes(2)
  })
  it('data-store failure also remains an error instead of an absence claim', async () => {
    orama.query.mockResolvedValue({ hits: [], total: 0 })
    ;(db.query.searchStats.findFirst as jest.Mock).mockRejectedValueOnce(new Error('database unavailable'))
    await expect(service.search({ q: 'x' })).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})

describe('normalized search routing', () => {
  const orama = { query: jest.fn(), upsertMany: jest.fn() }
  const aladdin = { searchAndCache: jest.fn() }
  const naru = { searchAndCacheBooks: jest.fn(), getBookByIsbn: jest.fn() }
  let service: SearchService
  beforeEach(() => {
    jest.resetAllMocks()
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
    service = new SearchService(orama as never, aladdin as never, naru as never)
    orama.query.mockResolvedValue({ hits: [{ isbn: '9788936434120', title: '소년이 온다' }], total: 1 })
    aladdin.searchAndCache.mockResolvedValue([])
    naru.searchAndCacheBooks.mockResolvedValue({ items: [], total: 1 })
    ;(db.query.searchStats.findFirst as jest.Mock).mockResolvedValue({ remoteTotal: 999 })
    ;(db.insert as jest.Mock).mockReturnValue({ values: () => Promise.resolve({}) })
  })
  afterEach(() => jest.restoreAllMocks())
  it.each(['all', 'title', 'author', 'publisher'] as const)('propagates %s to both enrichment providers', async searchType => {
    await service.search({ q: '  한강  ', searchType })
    expect(orama.query).toHaveBeenCalledWith(expect.objectContaining({ q: '한강', searchType }))
    expect(naru.searchAndCacheBooks).toHaveBeenCalledWith('한강', 1, 60, searchType)
    expect(aladdin.searchAndCache).toHaveBeenCalledWith('한강', searchType)
  })
  it('uses canonical ISBN and exact local total, never remote keyword totals or title enrichment', async () => {
    const result = await service.search({ q: '8936434128' })
    expect(result.total).toBe(1)
    expect(orama.query).toHaveBeenCalledWith(expect.objectContaining({ q: '9788936434120', searchType: 'isbn' }))
    expect(naru.searchAndCacheBooks).not.toHaveBeenCalled()
    expect(aladdin.searchAndCache).not.toHaveBeenCalled()
  })
  it('normalizes author role syntax before upstream searches', async () => {
    await service.search({ q: '지은이: 한강', searchType: 'author' })
    expect(naru.searchAndCacheBooks).toHaveBeenCalledWith('한강', 1, 60, 'author')
  })
  it('missed ISBN uses exact metadata lookup and requery rather than keyword search', async () => {
    orama.query.mockResolvedValueOnce({ hits: [], total: 0 })
    const book = { isbn: '9788936434120', title: '소년이 온다' }
    naru.getBookByIsbn.mockResolvedValue(book)
    expect((await service.search({ q: 'ISBN-10: 8936434128' })).total).toBe(1)
    expect(naru.getBookByIsbn).toHaveBeenCalledWith('9788936434120')
    expect(orama.upsertMany).toHaveBeenCalledWith([book])
    expect(naru.searchAndCacheBooks).not.toHaveBeenCalled()
  })
  it('does not accept unrelated metadata from an ISBN lookup', async () => {
    orama.query.mockResolvedValue({ hits: [], total: 0 })
    naru.getBookByIsbn.mockResolvedValue({ isbn: '9791161571195', title: '다른 책' })
    ;(db.execute as jest.Mock).mockResolvedValue([])
    ;(db.select as jest.Mock).mockReturnValue({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) })
    expect((await service.search({ q: '8936434128' })).items).toEqual([])
    expect(orama.upsertMany).not.toHaveBeenCalled()
  })
  it.each([' ', '9788936434121'])('rejects invalid explicit ISBN/empty query %s as 400 before fetching', async q => {
    await expect(service.search({ q, searchType: 'isbn' })).rejects.toBeInstanceOf(BadRequestException)
    expect(orama.query).not.toHaveBeenCalled()
  })
  it('sync throttling and cache keys are scoped by the effective search type', async () => {
    await service.search({ q: '한강', searchType: 'author' })
    await service.search({ q: '한강', searchType: 'title' })
    expect(naru.searchAndCacheBooks).toHaveBeenCalledTimes(2)
    await service.search({ q: ' 한강 ', searchType: 'title' })
    expect(orama.query).toHaveBeenCalledTimes(2)
  })
  it('autocomplete shares ISBN detection and normalization', async () => {
    await service.suggest('8936434128')
    expect(orama.query).toHaveBeenCalledWith(expect.objectContaining({ q: '9788936434120', searchType: 'isbn' }))
  })
})
