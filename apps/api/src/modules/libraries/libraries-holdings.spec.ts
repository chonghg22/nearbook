import { LibrariesService } from './libraries.service'
import { observeHolding } from './holding-observation'

jest.mock('@nearbook/db', () => ({}))
const isbn = '9788936434120'
const now = new Date('2026-10-14T00:00:00Z')
const near = Array.from({ length: 30 }, (_, i) => ({ id: 111000 + i, name: `도서관${i}`, region: '서울특별시', distanceKm: i / 10 }))
const snapshot = (has: string, loan?: string) => ({ availability: observeHolding({ response: { result: { hasBook: has, loanAvailable: loan } } }, now) })

describe('nearby holding coverage', () => {
  const upstream = { getLibrariesByBook: jest.fn(), getBookOwnership: jest.fn() }
  let service: LibrariesService
  beforeEach(() => {
    jest.resetAllMocks()
    upstream.getLibrariesByBook.mockResolvedValue([])
    upstream.getBookOwnership.mockResolvedValue(snapshot('N', 'N'))
    service = new LibrariesService(upstream as never, {} as never, {} as never, {} as never)
    jest.spyOn(service, 'findNear').mockResolvedValue(near)
  })
  it('does not call upstream when there are no nearby libraries', async () => {
    jest.spyOn(service, 'findNear').mockResolvedValue([])
    expect((await service.getNearbyHoldings(37, 127, isbn)).holdings).toMatchObject({ nearbyCount: 0, checkedCount: 0, unknownCount: 0 })
    expect(upstream.getLibrariesByBook).not.toHaveBeenCalled()
    expect(upstream.getBookOwnership).not.toHaveBeenCalled()
  })
  it('retains real nonownership and makes the ten-call limit explicit', async () => {
    const result = await service.getNearbyHoldings(37, 127, isbn)
    expect(result.libraries).toHaveLength(10)
    expect(result.holdings).toMatchObject({ notHeldCount: 10, checkedCount: 10, uncheckedCount: 20, limited: true })
    expect(upstream.getBookOwnership).toHaveBeenCalledTimes(10)
  })
  it('retains unknown rows rather than dropping them, without retrying twice', async () => {
    upstream.getBookOwnership.mockRejectedValue(new Error('API_LIMIT_EXCEEDED'))
    const result = await service.getNearbyHoldings(37, 127, isbn)
    expect(result.libraries.every((lib) => lib.status === 'unknown' && lib.hasBook === null)).toBe(true)
    expect(result.holdings).toMatchObject({ checkedCount: 0, unknownCount: 10, notHeldCount: 0 })
    expect(upstream.getBookOwnership).toHaveBeenCalledTimes(10)
  })
  it('uses holding index only to prioritize, not to prove other libraries do not hold the book', async () => {
    upstream.getLibrariesByBook.mockResolvedValue([{ id: near[20]!.id }])
    upstream.getBookOwnership.mockResolvedValueOnce(snapshot('Y', 'Y')).mockRejectedValueOnce({ response: { status: 503 } })
    const result = await service.getNearbyHoldings(37, 127, isbn)
    expect(result.libraries[0]!.id).toBe(near[20]!.id)
    expect(result.holdings).toMatchObject({ heldCount: 1, availableCount: 1, unknownCount: 1, notHeldCount: 8 })
    expect(upstream.getBookOwnership).toHaveBeenCalledTimes(10)
  })
  it('falls back to nearby candidates after index outage', async () => {
    upstream.getLibrariesByBook.mockRejectedValue(new Error('503'))
    upstream.getBookOwnership.mockResolvedValue(snapshot('Y', 'N'))
    const result = await service.getNearbyHoldings(37, 127, isbn)
    expect(result.holdings).toMatchObject({ heldCount: 10, borrowedCount: 10, unknownCount: 0 })
  })
  it('keeps the single ownership helper nullable during errors', async () => {
    upstream.getBookOwnership.mockRejectedValue(new Error('429'))
    expect(await service.checkOwnership(isbn, 111314)).toBeNull()
  })
})
