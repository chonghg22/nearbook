import { ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JeongbonaruService } from './jeongbonaru.service'
import { db } from '@nearbook/db'
import type { JeongbonaruClient } from './jeongbonaru.client'
import type { CacheService } from '../../common/cache/cache.service'

jest.mock('@nearbook/db', () => ({
  db: { query: { bookCache: { findFirst: jest.fn() } } },
  bookCache: { isbn: 'isbn' },
  eq: jest.fn(),
  sql: jest.fn(),
}))

describe('book lookup: absent vs unavailable', () => {
  const lookup = db.query.bookCache.findFirst as jest.Mock
  let get: jest.Mock
  let service: JeongbonaruService

  beforeEach(() => {
    jest.clearAllMocks()
    lookup.mockResolvedValue(undefined)
    get = jest.fn()
    service = new JeongbonaruService({ get, peekBook: jest.fn().mockResolvedValue(undefined) } as unknown as JeongbonaruClient, {} as CacheService)
  })

  it('returns fresh cached metadata without calling the external API', async () => {
    const cached = { isbn: '9791161571195', title: '불편한 편의점', expiresAt: new Date(Date.now() + 60000) }
    lookup.mockResolvedValue(cached)
    expect(await service.getBookByIsbn(cached.isbn)).toEqual(cached)
    expect(get).not.toHaveBeenCalled()
  })

  it('never acquires different missing ISBNs through passive reads or search enrichment', async () => {
    const results = await Promise.allSettled(Array.from({ length: 50 }, (_, i) => service.getBookByIsbn(String(9780000000000 + i))))
    expect(results.every((r) => r.status === 'rejected' && r.reason.status === 409)).toBe(true)
    expect(get).not.toHaveBeenCalled()
  })

  it('uses the bounded LOW SSR scope only when an operator explicitly enables a nonzero budget', async () => {
    const enabled = new JeongbonaruService({ get, peekBook: jest.fn() } as never, {} as never,
      new ConfigService({ JEONGBONARU_SSR_DAILY_LIMIT: 2 }))
    get.mockResolvedValue({ response: { docs: [] } })
    expect(await enabled.getBookByIsbn('9791161571195')).toBeNull()
    expect(get).toHaveBeenCalledWith('/srchBooks', expect.any(Object), { priority: 'LOW', scope: 'ssr' })
  })

  it('does not fetch with an invalid SSR budget', async () => {
    const invalid = new JeongbonaruService({ get, peekBook: jest.fn() } as never, {} as never,
      new ConfigService({ JEONGBONARU_SSR_DAILY_LIMIT: 'invalid' }))
    await expect(invalid.getBookByIsbn('9791161571195')).rejects.toBeInstanceOf(ServiceUnavailableException)
    expect(get).not.toHaveBeenCalled()
  })

  it('preserves expired metadata as fallback during a transient outage', async () => {
    const cached = { isbn: '9791161571195', title: '불편한 편의점', expiresAt: new Date(0) }
    lookup.mockResolvedValue(cached)
    get.mockRejectedValue(new Error('timeout'))
    expect(await service.getBookByIsbn(cached.isbn)).toEqual(cached)
  })

  for (const failure of ['timeout', 'API_LIMIT_EXCEEDED', 'TLS failure', 'upstream 503']) {
    it(`throws HTTP 503 without cached metadata for ${failure}`, async () => {
      get.mockRejectedValue(new Error(failure))
      await expect(service.getBookByIsbn('9791161571195', 'HIGH', true)).rejects.toBeInstanceOf(ServiceUnavailableException)
    })
  }

  it('returns null only for a valid empty external result', async () => {
    get.mockResolvedValue({ response: { docs: [], numFound: 0 } })
    expect(await service.getBookByIsbn('9791161571195', 'HIGH', true)).toBeNull()
  })

  for (const response of [{}, { response: {} }, { response: { docs: [{}] } }]) {
    it('treats malformed upstream data as unavailable, not absent', async () => {
      get.mockResolvedValue(response)
      await expect(service.getBookByIsbn('9791161571195', 'HIGH', true)).rejects.toBeInstanceOf(ServiceUnavailableException)
    })
  }
  it('keyword enrichment timeout is an error rather than a successful empty result', async () => {
    get.mockRejectedValue(new Error('timeout'))
    await expect(service.searchAndCacheBooks('제목')).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
  it('keyword enrichment rejects malformed envelopes but accepts a valid empty response', async () => {
    get.mockResolvedValueOnce({ response: {} })
    await expect(service.searchAndCacheBooks('제목')).rejects.toBeInstanceOf(ServiceUnavailableException)
    get.mockResolvedValueOnce({ response: { docs: [], numFound: 0 } })
    expect(await service.searchAndCacheBooks('제목')).toEqual({ items: [], total: 0 })
  })
})
