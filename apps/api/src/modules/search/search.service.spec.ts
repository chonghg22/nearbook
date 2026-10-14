import { Logger, ServiceUnavailableException } from '@nestjs/common'
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
