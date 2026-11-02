import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'

jest.mock('@nearbook/db', () => {
  const mocks = { findFirst: jest.fn(), returning: jest.fn(), onConflictDoNothing: jest.fn(), insert: jest.fn() }
  mocks.onConflictDoNothing.mockImplementation(() => ({ returning: mocks.returning }))
  mocks.insert.mockImplementation(() => ({ values: () => ({ onConflictDoNothing: mocks.onConflictDoNothing }) }))
  return { mocks, db: { query: { users: { findFirst: mocks.findFirst } }, insert: mocks.insert }, users: { supabaseUserId: 'uid' }, eq: jest.fn() }
})

describe('getOrCreateUser with concurrent first requests', () => {
  const mocks = jest.requireMock('@nearbook/db').mocks
  const service = new AuthService(new ConfigService())
  const row = { id: 7, supabaseUserId: 'verified-id' }
  beforeEach(() => {
    jest.clearAllMocks()
    mocks.findFirst.mockReset()
    mocks.returning.mockReset()
  })

  it('keeps existing user rows unchanged', async () => {
    mocks.findFirst.mockResolvedValue(row)
    await expect(service.getOrCreateUser('verified-id')).resolves.toEqual(row)
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('returns a newly created user', async () => {
    mocks.findFirst.mockResolvedValue(undefined)
    mocks.returning.mockResolvedValue([row])
    await expect(service.getOrCreateUser('verified-id', 'test@example.invalid')).resolves.toEqual(row)
    expect(mocks.onConflictDoNothing).toHaveBeenCalledWith({ target: 'uid' })
  })

  it('returns the concurrent winner instead of failing a duplicate registration', async () => {
    mocks.findFirst.mockResolvedValueOnce(undefined).mockResolvedValueOnce(row)
    mocks.returning.mockResolvedValue([])
    await expect(service.getOrCreateUser('verified-id')).resolves.toEqual(row)
    expect(mocks.findFirst).toHaveBeenCalledTimes(2)
  })

  it('fails explicitly if no row exists after a conflict', async () => {
    mocks.findFirst.mockResolvedValue(undefined)
    mocks.returning.mockResolvedValue([])
    await expect(service.getOrCreateUser('verified-id')).rejects.toThrow('Unable to initialize local user')
  })
})
