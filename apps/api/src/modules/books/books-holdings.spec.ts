import { BooksService } from './books.service'
import { BooksController } from './books.controller'

jest.mock('@nearbook/db', () => ({}))
describe('independent holdings endpoint', () => {
  it('does not require book metadata or affiliate requests to show holding states', async () => {
    const data = { libraries: [], holdings: { nearbyCount: 0 } }
    const libraries = { getNearbyHoldings: jest.fn().mockResolvedValue(data) }
    const affiliates = { getAffiliateOptions: jest.fn() }
    const service = new BooksService({} as never, libraries as never, affiliates as never, {} as never, {} as never, {} as never)
    jest.spyOn(service, 'getByIsbn').mockRejectedValue(new Error('metadata outage'))
    expect(await service.getHoldings('9788936434120', 37, 127)).toBe(data)
    expect(service.getByIsbn).not.toHaveBeenCalled()
    expect(affiliates.getAffiliateOptions).not.toHaveBeenCalled()
  })
  it.each([
    ['bad', '37', '127', 5], ['9788936434120', 'NaN', '127', 5],
    ['9788936434120', '91', '127', 5], ['9788936434120', '37', '181', 5],
    ['9788936434120', '37', '127', 0], ['9788936434120', '37', '127', 21],
  ])('rejects malformed input before upstream calls %#', (isbn, lat, lng, radius) => {
    const service = { getHoldings: jest.fn() }
    const controller = new BooksController(service as never)
    expect(() => controller.getHoldings(isbn as string, lat as string, lng as string, radius as number)).toThrow()
    expect(service.getHoldings).not.toHaveBeenCalled()
  })
})
