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
  const service = new AuthService(new ConfigService(), { verify: jest.fn() } as never)
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

describe('verifyAccessToken order', () => {
  const config = (env: Record<string, string>) => ({ get: (key: string) => env[key] }) as unknown as ConfigService
  const fetchMock = jest.fn()
  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('accepts a Nearbook session token locally without calling Supabase', async () => {
    const sessions = { verify: jest.fn().mockResolvedValue({ sub: 'subject', sid: 's', prv: 'kakao', nick: '독자' }) }
    const service = new AuthService(config({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }), sessions as never)
    await expect(service.verifyAccessToken('t')).resolves.toEqual({ supabaseUserId: 'subject', email: '', provider: 'kakao', nickname: '독자' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to Supabase only while it is still configured', async () => {
    const sessions = { verify: jest.fn().mockResolvedValue(null) }
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'legacy', app_metadata: { provider: 'kakao' } })))
    const legacy = new AuthService(config({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', NODE_ENV: 'production' }), sessions as never)
    await expect(legacy.verifyAccessToken('t')).resolves.toMatchObject({ supabaseUserId: 'legacy' })

    fetchMock.mockClear()
    const removed = new AuthService(config({ NODE_ENV: 'production' }), sessions as never)
    await expect(removed.verifyAccessToken('t')).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
