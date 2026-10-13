import { BooksService } from './books.service'

jest.mock('@nearbook/db', () => ({}))

describe('empty curation caching', () => {
  const cache = { get: jest.fn(), set: jest.fn() }
  const curations = { getCategories: jest.fn(), getCategoryBooks: jest.fn() }
  const service = new BooksService({} as never, {} as never, {} as never, cache as never, {} as never, curations as never)
  beforeEach(() => jest.clearAllMocks())

  it('does not cache an empty category list for six hours', async () => {
    curations.getCategoryBooks.mockResolvedValue([])
    expect(await service.getByCategory('81')).toEqual([])
    expect(cache.set).not.toHaveBeenCalled()
  })
  it('does not cache all-zero category counts', async () => {
    curations.getCategories.mockResolvedValue([{ code: '81', count: 0 }])
    await service.getCategories()
    expect(cache.set).not.toHaveBeenCalled()
  })
  it('keeps nonempty snapshots with their provenance in the normal cache', async () => {
    const rows = [{ isbn: '9788936434120', curationPeriod: '2026-07', fetchedAt: '2026-07-01T00:00:00Z' }]
    curations.getCategoryBooks.mockResolvedValue(rows)
    expect(await service.getByCategory('81')).toEqual(rows)
    expect(cache.set).toHaveBeenCalledWith('category:81:40', rows, 21600000)
  })
})
