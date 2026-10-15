jest.mock('@nearbook/db', () => ({}))
jest.mock('axios', () => {
  const get = jest.fn()
  return {
    __esModule: true,
    default: { create: jest.fn(() => ({ get })) },
    isAxiosError: (error: any) => error?.isAxiosError === true,
    __get: get,
  }
})
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { JeongbonaruClient } from './jeongbonaru.client'
import { QuotaAccountingUnavailableError, QuotaBlockedError } from '../quota/quota.errors'
import { holdingFailure } from '../libraries/holding-observation'

describe('provider dispatch: one durable reservation per actual attempt', () => {
  const get = jest.requireMock('axios').__get as jest.Mock
  let client: JeongbonaruClient
  const quota = {
    acquire: jest.fn(),
    complete: jest.fn(),
    getStatus: jest.fn(),
    getLocalStatus: jest.fn(),
  }
  beforeEach(() => {
    jest.clearAllMocks()
    quota.acquire.mockReset().mockResolvedValue(123)
    quota.complete.mockReset().mockResolvedValue(undefined)
    get.mockReset().mockResolvedValue({ data: { response: { result: 'ok' } } })
    client = new JeongbonaruClient(
      new ConfigService({
        JEONGBONARU_API_KEY: 'test-key-never-log',
        JEONGBONARU_TIMEOUT_MS: '30000',
      }),
      quota as never
    )
    client.onModuleInit()
  })
  it('reserves before dispatch and completes the same ID once on success', async () => {
    expect(await client.get('/bookExist', { isbn13: '9788954682152' })).toEqual({
      response: { result: 'ok' },
    })
    expect(quota.acquire).toHaveBeenCalledWith('jeongbonaru', 'HIGH', '/bookExist')
    expect(quota.acquire.mock.invocationCallOrder[0]).toBeLessThan(get.mock.invocationCallOrder[0])
    expect(quota.complete).toHaveBeenCalledTimes(1)
    expect(quota.complete).toHaveBeenCalledWith(123, 200, expect.any(Number))
  })
  it.each(['QUOTA_BLOCKED_ALL', 'QUOTA_BLOCKED_LOW'] as const)(
    'does not dispatch, complete or retry when %s',
    async (reason) => {
      quota.acquire.mockRejectedValue(new QuotaBlockedError(reason))
      await expect(client.get('/bookExist')).rejects.toThrow('API_LIMIT_EXCEEDED')
      expect(get).not.toHaveBeenCalled()
      expect(quota.complete).not.toHaveBeenCalled()
      expect(quota.acquire).toHaveBeenCalledTimes(1)
      expect(holdingFailure(new QuotaBlockedError(reason))).toMatchObject({
        status: 'unknown',
        reason: 'quota',
      })
    }
  )
  it('fails closed if the accounting DB cannot reserve; never silently uses a process-local count', async () => {
    quota.acquire.mockRejectedValue(new QuotaAccountingUnavailableError())
    await expect(client.get('/bookExist')).rejects.toThrow('QUOTA_ACCOUNTING_UNAVAILABLE')
    expect(get).not.toHaveBeenCalled()
  })
  it('coalesces concurrent identical requests with differently ordered params into one reservation', async () => {
    let finish!: (value: unknown) => void
    get.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const first = client.get('/bookExist', { isbn13: '123', libCode: 111314 })
    const second = client.get('/bookExist', { libCode: 111314, isbn13: '123' })
    await Promise.resolve()
    expect(quota.acquire).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledTimes(1)
    finish({ data: { response: {} } })
    expect(await first).toEqual(await second)
    expect(quota.complete).toHaveBeenCalledTimes(1)
    get.mockResolvedValue({ data: { response: {} } })
    await client.get('/bookExist', { isbn13: '123', libCode: 111314 })
    expect(quota.acquire).toHaveBeenCalledTimes(2)
  })
  it('does not merge different queries, priorities or timeouts', async () => {
    await Promise.all([
      client.get('/bookExist', { isbn13: 'a' }),
      client.get('/bookExist', { isbn13: 'b' }),
      client.get('/bookExist', { isbn13: 'a' }, { priority: 'LOW' }),
      client.get('/bookExist', { isbn13: 'a' }, { timeoutMs: 5000 }),
    ])
    expect(quota.acquire).toHaveBeenCalledTimes(4)
    expect(quota.acquire).toHaveBeenCalledWith('jeongbonaru', 'LOW', '/bookExist')
  })
  it.each([
    {
      error: { isAxiosError: true, response: { status: 429 }, message: 'test-key-never-log' },
      status: 429,
    },
    {
      error: { isAxiosError: true, code: 'ECONNABORTED', message: 'test-key-never-log' },
      status: 500,
    },
    {
      error: { isAxiosError: true, response: { status: 503 }, message: 'test-key-never-log' },
      status: 503,
    },
  ])('records one failed attempt and no automatic retry for $status', async ({ error, status }) => {
    const log = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
    try {
      get.mockRejectedValue(error)
      await expect(client.get('/bookExist')).rejects.toBe(error)
      expect(get).toHaveBeenCalledTimes(1)
      expect(quota.complete).toHaveBeenCalledTimes(1)
      expect(quota.complete).toHaveBeenCalledWith(123, status, expect.any(Number))
      expect(JSON.stringify(log.mock.calls)).not.toContain('test-key-never-log')
    } finally {
      log.mockRestore()
    }
  })
  it('does not double count application errors or reveal provider error text', async () => {
    get.mockResolvedValue({
      data: { response: { error: 'secret-provider-url?authKey=test-key-never-log' } },
    })
    await expect(client.get('/bookExist')).rejects.toThrow('JEONGBONARU_APP_ERROR')
    expect(quota.complete).toHaveBeenCalledTimes(1)
    expect(quota.complete).toHaveBeenCalledWith(123, 422, expect.any(Number))
  })
  it('retries only on a later explicit request after a failed single-flight is removed', async () => {
    get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: { response: {} } })
    await expect(client.get('/bookExist')).rejects.toThrow('offline')
    await client.get('/bookExist')
    expect(get).toHaveBeenCalledTimes(2)
    expect(quota.acquire).toHaveBeenCalledTimes(2)
  })
  it('does not permit proxy callers to replace the configured authKey/format or raise the timeout', async () => {
    await client.get(
      '/bookExist',
      { authKey: 'attacker-key', format: 'xml', libCode: 1 },
      { timeoutMs: 99999 }
    )
    expect(get).toHaveBeenCalledWith('/bookExist', {
      params: { libCode: 1, authKey: 'test-key-never-log', format: 'json' },
      timeout: 30000,
    })
  })
  it('rejects unsafe endpoint/configuration before reserving anything', async () => {
    await expect(client.get('https://evil.example')).rejects.toThrow('INVALID_PROVIDER_ENDPOINT')
    expect(quota.acquire).not.toHaveBeenCalled()
    expect(() =>
      new JeongbonaruClient(
        new ConfigService({ JEONGBONARU_TIMEOUT_MS: 'NaN' }),
        quota as never
      ).onModuleInit()
    ).toThrow('Invalid provider numeric configuration')
    expect(axios.create).toHaveBeenCalled()
  })
  it('does not spend quota when the API key is missing', async () => {
    const missing = new JeongbonaruClient(new ConfigService(), quota as never)
    missing.onModuleInit()
    await expect(missing.get('/bookExist')).rejects.toThrow('PROVIDER_NOT_CONFIGURED')
    expect(quota.acquire).not.toHaveBeenCalled()
  })
  it('exposes status outages honestly as 503 instead of zero usage', async () => {
    quota.getStatus.mockRejectedValue(new Error('db-secret'))
    await expect(client.getStatus()).rejects.toMatchObject({
      status: 503,
      message: 'Provider usage status is temporarily unavailable',
    })
  })
  it('does not stall a successful response on delayed outcome persistence after durable reservation', async () => {
    quota.complete.mockImplementation(() => new Promise(() => {}))
    await expect(client.get('/bookExist')).resolves.toMatchObject({ response: { result: 'ok' } })
    expect(quota.acquire).toHaveBeenCalledTimes(1)
    expect(quota.complete).toHaveBeenCalledTimes(1)
  })
})
