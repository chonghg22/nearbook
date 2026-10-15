jest.mock('@nearbook/db', () => {
  const { sql, eq } = jest.requireActual('drizzle-orm')
  return { sql, eq, db: { execute: jest.fn(), transaction: jest.fn() } }
})
import 'reflect-metadata'
import { ServiceUnavailableException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule'
import request from 'supertest'
import { db } from '@nearbook/db'
import { CacheModule } from '../../common/cache/cache.module'
import { HomeCurationsModule } from '../home-curations/home-curations.module'
import { HomeCurationsService } from '../home-curations/home-curations.service'
import { HomeCurationsCron } from '../home-curations/home-curations.cron'
import { JeongbonaruModule } from '../jeongbonaru/jeongbonaru.module'
import { JeongbonaruService } from '../jeongbonaru/jeongbonaru.service'
import { PendingLookupCron } from '../jeongbonaru/pending-lookup.cron'
import { QuotaService } from '../quota/quota.service'
import { QuotaCron } from '../quota/quota.cron'
import { quotaPolicy, quotaMode } from '../quota/quota-policy'
import { QuotaBlockedError } from '../quota/quota.errors'
import { CURATION_JOBS, JobStatusService } from './job-status.service'
import { OperationsController } from './operations.controller'

describe('operational policy and runtime evidence', () => {
  const execute = db.execute as jest.Mock
  beforeEach(() => {
    jest.clearAllMocks()
    execute.mockReset()
  })
  it.each([0, -1, 'NaN', 0.5, Infinity])('rejects invalid configured budgets %s', (value) => {
    expect(() => quotaPolicy(new ConfigService({ JEONGBONARU_DAILY_LIMIT: value }))).toThrow()
  })
  it('defaults to verified 500, accepts lower budgets and caps old 30000 defaults', () => {
    expect(quotaPolicy(new ConfigService())).toMatchObject({ limit: 500, lowPriorityLimit: 475 })
    expect(quotaPolicy(new ConfigService({ JEONGBONARU_DAILY_LIMIT: '100' }))).toMatchObject({
      limit: 100,
      lowPriorityLimit: 95,
    })
    expect(quotaPolicy(new ConfigService({ JEONGBONARU_DAILY_LIMIT: '30000' }))).toMatchObject({
      limit: 500,
      limitClamped: true,
    })
  })
  it.each([
    [399, 'normal'],
    [400, 'warn'],
    [474, 'warn'],
    [475, 'critical'],
    [499, 'critical'],
    [500, 'blocked'],
  ])('maps threshold %s to %s', (count, mode) => {
    expect(quotaMode(Number(count), 500)).toBe(mode)
  })
  it('keeps health cheap and marks unobserved/restarted usage unknown, not zero', () => {
    expect(new QuotaService(new ConfigService()).getLocalStatus()).toMatchObject({
      called: null,
      remaining: null,
      mode: 'unknown',
    })
    expect(execute).not.toHaveBeenCalled()
  })
  it('never presents a previous-day snapshot as today or changes the cap after reset', async () => {
    execute.mockResolvedValue([
      { called: 400, succeeded: 399, unresolved: 1, day_key: '2020-01-01' },
    ])
    const quota = new QuotaService(new ConfigService())
    await quota.getStatus()
    expect(quota.getLocalStatus()).toMatchObject({ called: null, limit: 500, mode: 'unknown' })
  })
  it('fails closed on accounting errors and never includes raw SQL secrets', async () => {
    execute.mockRejectedValue(new Error('secret-database-password'))
    await expect(new QuotaService(new ConfigService()).getStatus()).rejects.toThrow(
      'QUOTA_ACCOUNTING_UNAVAILABLE'
    )
  })
  it('does not permit provider dispatch if the reservation transaction fails', async () => {
    ;(db.transaction as jest.Mock).mockRejectedValueOnce(new Error('secret-database-password'))
    await expect(
      new QuotaService(new ConfigService()).acquire('jeongbonaru', 'HIGH', '/bookExist')
    ).rejects.toThrow('QUOTA_ACCOUNTING_UNAVAILABLE')
  })
  it('retains last successful runtime observation after empty/failure and exposes no exception text', async () => {
    const jobs = new JobStatusService()
    await jobs.run('curation:loan', async () => ({
      refreshed: true,
      count: 20,
      periodKey: '2026-10-15',
    }))
    const success = jobs.getStatus()['curation:loan']
    expect(success.state).toBe('success')
    expect(success.lastSuccessAt).toBeTruthy()
    await jobs.run('curation:loan', async () => ({ refreshed: false, count: 0, reason: 'empty' }))
    expect(jobs.getStatus()['curation:loan']).toMatchObject({
      state: 'empty',
      lastSuccessAt: success.lastSuccessAt,
    })
    await jobs.run('curation:loan', async () => {
      throw new Error('secret-provider-text')
    })
    expect(jobs.getStatus()['curation:loan']).toMatchObject({
      state: 'failed',
      reason: 'refresh-failed',
      lastSuccessAt: success.lastSuccessAt,
    })
    expect(JSON.stringify(jobs.getStatus())).not.toContain('secret-provider-text')
    expect(new JobStatusService().getStatus()).toEqual({})
  })
  it('skips overlapping runtime jobs and records partial rather than false full success', async () => {
    const jobs = new JobStatusService()
    let done!: (value: { refreshed: number; skipped: number; count: number }) => void
    const run = jobs.run(
      'curation:categories',
      () =>
        new Promise((resolve) => {
          done = resolve
        })
    )
    const duplicate = jest.fn()
    await jobs.run('curation:categories', duplicate)
    expect(duplicate).not.toHaveBeenCalled()
    done({ refreshed: 2, skipped: 1, count: 80 })
    await run
    expect(jobs.getStatus()['curation:categories']).toMatchObject({
      state: 'partial',
      count: 80,
      lastSuccessAt: null,
    })
  })
  it('does not activate any outbound notification in quota observation and deduplicates overlaps', async () => {
    let finish!: (value: { mode: string; called: number; limit: number }) => void
    const quota = {
      getStatus: jest.fn(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      ),
    }
    const cron = new QuotaCron(quota as never)
    const first = cron.checkThresholds()
    await cron.checkThresholds()
    expect(quota.getStatus).toHaveBeenCalledTimes(1)
    finish({ mode: 'warn', called: 400, limit: 500 })
    await first
  })
  it('returns sanitized 503 instead of a false zero/success when status dependencies fail', async () => {
    const status = new OperationsController(
      { getStatus: jest.fn().mockRejectedValue(new Error('secret')) } as never,
      new JobStatusService(),
      {} as never
    )
    execute.mockResolvedValue([])
    await expect(status.status()).rejects.toBeInstanceOf(ServiceUnavailableException)
    await expect(status.status()).rejects.toThrow('Operational status is temporarily unavailable')
  })
})

describe('actual module graph and named scheduler registration', () => {
  it('boots real provider/curation modules, registers exactly one of each job and leaves pending processing absent', async () => {
    const testing = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ JEONGBONARU_API_KEY: 'test-only', JEONGBONARU_DAILY_LIMIT: '500' })],
        }),
        ScheduleModule.forRoot(),
        CacheModule,
        JeongbonaruModule,
        HomeCurationsModule,
      ],
    }).compile()
    const app = testing.createNestApplication()
    try {
      await app.init()
      const jobs = app.get(SchedulerRegistry).getCronJobs()
      for (const key of Object.keys(CURATION_JOBS)) expect(jobs.has(key)).toBe(true)
      expect(jobs.has('quota:observe')).toBe(true)
      expect(jobs.size).toBe(6)
      expect(() => app.get(PendingLookupCron)).toThrow()
      const quota = app.get(QuotaService)
      jest.spyOn(quota, 'getStatus').mockResolvedValue({ called: 4, limit: 500 } as never)
      ;(db.execute as jest.Mock).mockResolvedValue([
        {
          section: 'home:loan_item_books',
          period_key: '2026-10-15',
          count: 20,
          latest_fetched_at: '2026-10-15T03:10:00Z',
        },
      ])
      const result = await app.get(OperationsController).status()
      expect(result.quota).toMatchObject({ called: 4, limit: 500 })
      expect(result.jobs.every((job) => job.registered && job.lastRun === null)).toBe(true)
      expect(result.pendingLookup).toMatchObject({ registered: false, enabled: false })
      expect(result.evidence).toMatchObject({
        jobHistory: 'current-process-only',
        notificationDelivery: 'deferred-unchanged',
      })
      const response = await request(app.getHttpServer()).get('/operations/status').expect(200)
      expect(response.headers['cache-control']).toBe('no-store')
      expect(response.body.jobs.every((job: { registered: boolean }) => job.registered)).toBe(true)
      expect(response.body.quota.called).toBe(4)
      expect(JSON.stringify(response.body)).not.toMatch(/authKey|test-only|payload|supabase/)
      const reserve = jest
        .spyOn(quota, 'acquire')
        .mockRejectedValue(new QuotaBlockedError('QUOTA_BLOCKED_ALL'))
      const blocked = await request(app.getHttpServer())
        .get('/naru/bookExist?isbn13=9788954682152&libCode=111314')
        .expect(429)
      expect(blocked.body.message).toBe('API_LIMIT_EXCEEDED')
      expect(reserve).toHaveBeenCalledWith('jeongbonaru', 'HIGH', '/bookExist')
      const curation = app.get(HomeCurationsService)
      jest.spyOn(curation, 'refreshLoanItemBooks').mockResolvedValue({
        refreshed: false,
        count: 0,
        periodKey: '2026-10-15',
        reason: 'upstream-or-storage',
      })
      await app.get(HomeCurationsCron).refreshLoanItemBooks()
      expect(app.get(JobStatusService).getStatus()['curation:loan']).toMatchObject({
        state: 'failed',
        count: 0,
        periodKey: '2026-10-15',
      })
    } finally {
      await app.close()
    }
  })
})

describe('curation refresh: LOW priority, empty vs failure, no replacement on failure', () => {
  const mock = {
    getMonthlyKeywords: jest.fn(),
    getHotTrendBooks: jest.fn(),
    getLoanItemBooks: jest.fn(),
    getLibraryNewArrivalBooks: jest.fn(),
  }
  let service: HomeCurationsService
  beforeEach(() => {
    jest.resetAllMocks()
    service = new HomeCurationsService(mock as never)
  })
  it.each([
    { fn: 'refreshMonthlyKeywords', provider: 'getMonthlyKeywords' },
    { fn: 'refreshHotTrendBooks', provider: 'getHotTrendBooks' },
    { fn: 'refreshLoanItemBooks', provider: 'getLoanItemBooks' },
  ] as const)(
    '$fn reports empty and failure differently and passes LOW',
    async ({ fn, provider }) => {
      mock[provider]
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('secret-provider-text'))
      expect(await service[fn]()).toMatchObject({ refreshed: false, reason: 'empty', count: 0 })
      expect(await service[fn]()).toMatchObject({
        refreshed: false,
        reason: 'upstream-or-storage',
        count: 0,
      })
      expect(JSON.stringify(mock[provider].mock.calls)).toContain('LOW')
      expect(db.execute).not.toHaveBeenCalled()
    }
  )
  it('new arrivals failure never replaces the stored snapshot and is LOW', async () => {
    mock.getLibraryNewArrivalBooks.mockRejectedValue(new Error('offline'))
    expect(await service.refreshLibraryNewArrivals(111314, 40, '2026-10')).toMatchObject({
      refreshed: false,
      reason: 'upstream-or-storage',
    })
    expect(mock.getLibraryNewArrivalBooks).toHaveBeenCalledWith(111314, 40, '2026-10', 'LOW')
  })
  it('halts category fan-out as soon as quota is blocked and records blocked rather than empty', async () => {
    mock.getLoanItemBooks.mockRejectedValue(new QuotaBlockedError('QUOTA_BLOCKED_LOW'))
    const result = await service.refreshCategoryCurations()
    expect(result).toMatchObject({ refreshed: 0, skipped: 1, count: 0, reason: 'quota' })
    expect(mock.getLoanItemBooks).toHaveBeenCalledTimes(1)
    const jobs = new JobStatusService()
    await jobs.run('curation:categories', async () => result)
    expect(jobs.getStatus()['curation:categories']).toMatchObject({
      state: 'blocked',
      reason: 'quota',
      lastSuccessAt: null,
    })
  })
  it('stops fallback expansion on quota errors and never disguises total upstream failure as empty success', async () => {
    const get = jest.fn().mockRejectedValue(new QuotaBlockedError('QUOTA_BLOCKED_LOW'))
    const naru = new JeongbonaruService({ get } as never, {} as never)
    await expect(naru.getMonthlyKeywords()).rejects.toThrow('API_LIMIT_EXCEEDED')
    expect(get).toHaveBeenCalledTimes(1)
    get.mockReset().mockRejectedValue(new Error('upstream'))
    await expect(naru.getHotTrendBooks()).rejects.toThrow('upstream')
    expect(get.mock.calls.length).toBeLessThanOrEqual(4)
  })
})
