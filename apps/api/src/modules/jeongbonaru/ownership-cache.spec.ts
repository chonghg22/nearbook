import { JeongbonaruService } from './jeongbonaru.service'

jest.mock('@nearbook/db', () => ({}))
describe('timestamped ownership cache', () => {
  const get = jest.fn()
  const cache = { get: jest.fn(), set: jest.fn() }
  let service: JeongbonaruService
  beforeEach(() => {
    jest.resetAllMocks()
    service = new JeongbonaruService({ get } as never, cache as never)
  })
  it('keeps confirmed observations timestamped with a five-minute TTL', async () => {
    get.mockResolvedValue({ response: { result: { hasBook: 'Y', loanAvailable: 'Y' } } })
    const result = await service.getBookOwnership('9788936434120', 111314)
    expect(result.availability).toMatchObject({ status: 'available', source: 'jeongbonaru:bookExist' })
    expect(cache.set).toHaveBeenCalledWith('loan:v2:9788936434120:111314', result, 300000)
    expect(get).toHaveBeenCalledWith('/bookExist', { isbn13: '9788936434120', libCode: 111314 }, { timeoutMs: 5000 })
  })
  it('does not reset checkedAt on a cache hit', async () => {
    const snapshot = { availability: { checkedAt: '2026-10-14T00:00:00Z' } }
    cache.get.mockReturnValue(snapshot)
    expect(await service.getBookOwnership('9788936434120', 111314)).toBe(snapshot)
    expect(get).not.toHaveBeenCalled()
  })
  it('does not cache partially known loan status', async () => {
    get.mockResolvedValue({ response: { result: { hasBook: 'Y' } } })
    expect((await service.getBookOwnership('9788936434120', 111314)).availability).toMatchObject({ status: 'unknown', hasBook: true, loanAvailable: null })
    expect(cache.set).not.toHaveBeenCalled()
  })
  it.each([{}, { response: {} }, { response: { result: { hasBook: 'N', loanAvailable: 'Y' } } }])
    ('rejects invalid results without caching absence %#', async (payload) => {
      get.mockResolvedValue(payload)
      await expect(service.getBookOwnership('9788936434120', 111314)).rejects.toThrow('INVALID_OWNERSHIP_RESULT')
      expect(cache.set).not.toHaveBeenCalled()
    })
  it('allows recovery after a failed lookup without negative caching', async () => {
    get.mockRejectedValueOnce(new Error('API_LIMIT_EXCEEDED')).mockResolvedValueOnce({ response: { result: { hasBook: 'N', loanAvailable: 'N' } } })
    await expect(service.getBookOwnership('9788936434120', 111314)).rejects.toThrow()
    expect(cache.set).not.toHaveBeenCalled()
    expect((await service.getBookOwnership('9788936434120', 111314)).availability.status).toBe('not_held')
    expect(get).toHaveBeenCalledTimes(2)
  })
})
