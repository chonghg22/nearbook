const mockDb = {
  transaction: jest.fn(),
}

jest.mock('@nearbook/db', () => ({
  db: mockDb,
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
  and: jest.fn(),
  count: jest.fn(),
  eq: jest.fn(),
  eventApplicationRequests: {},
  libraries: {},
  libraryEventPrograms: {},
  users: {},
}))

import { EventApplicationsService } from './event-applications.service'

describe('EventApplicationsService', () => {
  let service: EventApplicationsService
  const admission = {
    waitForTurn: jest.fn().mockResolvedValue({
      allowed: true,
      mode: 'memory',
      waitedMs: 0,
      retryAfterMs: 0,
    }),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    service = new EventApplicationsService(admission as any)
  })

  it('confirms a queued application when capacity is available', async () => {
    const execute = jest.fn()
      .mockResolvedValueOnce([{ id: 1, program_id: 10 }])
      .mockResolvedValueOnce([{ id: 10, capacity: 5, confirmed_count: 4 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    mockDb.transaction.mockImplementation((callback) => callback({ execute }))

    const processed = await service.processQueuedBatch(2)

    expect(processed).toBe(1)
    expect(execute).toHaveBeenCalledTimes(5)
  })

  it('waitlists a queued application when capacity is full', async () => {
    const execute = jest.fn()
      .mockResolvedValueOnce([{ id: 2, program_id: 10 }])
      .mockResolvedValueOnce([{ id: 10, capacity: 5, confirmed_count: 5 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    mockDb.transaction.mockImplementation((callback) => callback({ execute }))

    const processed = await service.processQueuedBatch(2)

    expect(processed).toBe(1)
    expect(execute).toHaveBeenCalledTimes(4)
  })
})
