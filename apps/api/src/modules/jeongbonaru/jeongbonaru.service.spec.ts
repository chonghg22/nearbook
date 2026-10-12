import { ServiceUnavailableException } from '@nestjs/common'
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
    service = new JeongbonaruService({ get } as unknown as JeongbonaruClient, {} as CacheService)
  })

  it('returns fresh cached metadata without calling the external API', async () => {
    const cached = { isbn: '9791161571195', title: '불편한 편의점', expiresAt: new Date(Date.now() + 60000) }
    lookup.mockResolvedValue(cached)
    expect(await service.getBookByIsbn(cached.isbn)).toEqual(cached)
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
      await expect(service.getBookByIsbn('9791161571195')).rejects.toBeInstanceOf(ServiceUnavailableException)
    })
  }

  it('returns null only for a valid empty external result', async () => {
    get.mockResolvedValue({ response: { docs: [], numFound: 0 } })
    expect(await service.getBookByIsbn('9791161571195')).toBeNull()
  })

  for (const response of [{}, { response: {} }, { response: { docs: [{}] } }]) {
    it('treats malformed upstream data as unavailable, not absent', async () => {
      get.mockResolvedValue(response)
      await expect(service.getBookByIsbn('9791161571195')).rejects.toBeInstanceOf(ServiceUnavailableException)
    })
  }
})
