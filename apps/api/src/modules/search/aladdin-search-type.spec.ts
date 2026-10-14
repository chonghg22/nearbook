import { ConfigService } from '@nestjs/config'
import { AladdinFallbackService } from './aladdin-fallback.service'

jest.mock('@nearbook/db', () => ({
  db: { insert: () => ({ values: () => Promise.resolve({}) }) },
  apiUsage: {},
  bookCache: {},
}))
describe('documented fallback query type', () => {
  afterEach(() => jest.restoreAllMocks())
  it.each([
    ['all', 'Title'],
    ['title', 'Title'],
    ['author', 'Author'],
    ['publisher', 'Publisher'],
  ] as const)('%s sends %s', async (type, expected) => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ item: [] }))
    const service = new AladdinFallbackService({
      get: () => 'fake-test-key',
    } as unknown as ConfigService)
    await service.searchAndCache('한강', type)
    expect(new URL(String(fetch.mock.calls[0]?.[0])).searchParams.get('QueryType')).toBe(expected)
  })
  it('does not issue a broad fallback for ISBN', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch')
    const service = new AladdinFallbackService({
      get: () => 'fake-test-key',
    } as unknown as ConfigService)
    expect(await service.searchAndCache('9788936434120', 'isbn')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })
})
