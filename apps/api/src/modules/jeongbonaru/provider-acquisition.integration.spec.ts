// No application env files. This suite can only target the same isolated localhost DB as quota tests.
jest.mock('@nearbook/db', () => {
  const { sql, eq } = jest.requireActual('drizzle-orm')
  const url = process.env.NEARBOOK_QUOTA_TEST_DATABASE_URL
  if (!url) return { db: {}, sql, eq }
  const target = new URL(url)
  if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.pathname !== '/nearbook_quota_test')
    throw new Error('Use isolated localhost nearbook_quota_test only')
  const fromDb = jest.requireActual('node:module').createRequire(require.resolve('@nearbook/db'))
  const client = fromDb('postgres')(url, { max: 20, prepare: false })
  return { db: jest.requireActual('drizzle-orm/postgres-js').drizzle(client), sql, eq, __client: client }
})
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { ConfigService } from '@nestjs/config'
import { db, sql } from '@nearbook/db'
import { QuotaService } from '../quota/quota.service'
import { ProviderCacheService } from './provider-cache.service'
import { BookAcquisitionLimiter } from './book-acquisition-limiter.service'

const suite = process.env.NEARBOOK_QUOTA_TEST_DATABASE_URL ? describe : describe.skip
suite('shared acquisition: isolated PostgreSQL leases and reservations', () => {
  const cache = () => new ProviderCacheService()
  const quota = (refresh = 5, explicit = 3, total = 500) => new QuotaService(new ConfigService({
    JEONGBONARU_DAILY_LIMIT: String(total), JEONGBONARU_REFRESH_DAILY_LIMIT: String(refresh),
    JEONGBONARU_EXPLICIT_DAILY_LIMIT: String(explicit),
  }))
  beforeAll(async () => {
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS nearbook`)
    await db.execute(sql`CREATE TABLE IF NOT EXISTS nearbook.api_usage (
      id serial PRIMARY KEY, provider varchar(32), endpoint varchar(128), status_code integer,
      cached_hit boolean DEFAULT false, duration_ms integer, created_at timestamp DEFAULT (now() AT TIME ZONE 'UTC'))`)
    const migration = readFileSync(resolve(__dirname, '../../../../..', 'packages/db/src/migrations/0012_provider_acquisition.sql'), 'utf8')
    await jest.requireMock('@nearbook/db').__client.unsafe(migration)
  })
  beforeEach(async () => {
    await db.execute(sql`TRUNCATE nearbook.provider_response_cache, nearbook.book_acquisition_attempts, nearbook.api_usage RESTART IDENTITY`)
  })
  afterAll(async () => { await jest.requireMock('@nearbook/db').__client.end({ timeout: 1 }) })

  it('coalesces cold fetches across independent service instances and survives restart without another reservation', async () => {
    let calls = 0
    const provider = async () => {
      await quota().acquire('jeongbonaru', 'LOW', '/usageTrend', 'refresh')
      calls++
      await new Promise((done) => setTimeout(done, 80))
      return { response: { results: [] } }
    }
    const result = await Promise.all(Array.from({ length: 12 }, () => cache().get('/usageTrend', { libCode: 1 }, provider, 60)))
    expect(calls).toBe(1)
    expect(result.every((r) => !r.cacheInfo?.stale)).toBe(true)
    await cache().get('/usageTrend', { libCode: 1 }, provider, 60)
    expect(calls).toBe(1)
    expect((await quota().getStatus()).called).toBe(1)
  })

  it('shares the cache and lease across actual independent Node processes', async () => {
    const run = () => promisify(execFile)(process.execPath, [
      '-r', require.resolve('ts-node/register/transpile-only'), resolve(__dirname, 'fixtures/cache-worker.cjs'),
    ], { env: { ...process.env, DATABASE_URL: process.env.NEARBOOK_QUOTA_TEST_DATABASE_URL,
      TS_NODE_PROJECT: resolve(__dirname, '../../..', 'tsconfig.json') }, timeout: 15000 })
    const results = await Promise.all([run(), run()])
    expect(results.map((r) => JSON.parse(r.stdout))).toEqual([{ stale: false }, { stale: false }])
    expect((await quota().getStatus()).called).toBe(1)
    await run() // a fresh process reads the persisted response
    expect((await quota().getStatus()).called).toBe(1)
  }, 20000)

  it('retains stale empty successes on quota/transport failure without persisting an error as data', async () => {
    await cache().get('/loanItemSrch', { libCode: 1 }, async () => ({ response: { docs: [] } }), 60)
    await db.execute(sql`UPDATE nearbook.provider_response_cache SET expires_at = now() - interval '1 second'`)
    const failed = jest.fn().mockRejectedValue(new Error('quota/timeout'))
    const stale = await cache().get<{ response: { docs: unknown[] } }>('/loanItemSrch', { libCode: 1 }, failed, 60)
    expect(stale.cacheInfo?.stale).toBe(true)
    expect(stale.response.docs).toEqual([])
    const next = await cache().get('/loanItemSrch', { libCode: 1 }, failed, 60)
    expect(next.cacheInfo?.stale).toBe(true)
    expect(failed).toHaveBeenCalledTimes(1) // persisted 30s cooldown, including after restart
    await expect(cache().get('/loanItemSrch', { libCode: 2 }, failed, 60)).rejects.toThrow('quota/timeout')
    const rows = await db.execute(sql`SELECT payload FROM nearbook.provider_response_cache WHERE payload IS NOT NULL`)
    expect(rows).toHaveLength(1)
  })

  it('recovers an abandoned lease and fences a late former owner', async () => {
    const key = cache().key('/usageTrend', { libCode: 3 })
    await db.execute(sql`INSERT INTO nearbook.provider_response_cache(cache_key,lease_until,lease_token)
      VALUES (${key}, now() - interval '1 second', '00000000-0000-0000-0000-000000000001')`)
    const result = await cache().get('/usageTrend', { libCode: 3 }, async () => ({ response: { results: [] } }), 60)
    expect(result.cacheInfo?.stale).toBe(false)
    const writes = await db.execute(sql`UPDATE nearbook.provider_response_cache SET payload = '{}'::jsonb
      WHERE cache_key = ${key} AND lease_token = '00000000-0000-0000-0000-000000000001' RETURNING cache_key`)
    expect(writes).toHaveLength(0)
  })

  it('serializes refresh and explicit scope caps independently under the global lock across instances', async () => {
    const results = await Promise.allSettled(Array.from({ length: 50 }, (_, i) =>
      quota().acquire('jeongbonaru', 'HIGH', '/fixture', i % 2 ? 'refresh' : 'explicit')))
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(8)
    const rows = await db.execute(sql`SELECT acquisition_scope, count(*)::int AS count FROM nearbook.api_usage GROUP BY 1 ORDER BY 1`)
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ acquisition_scope: 'refresh', count: 5 }),
      expect.objectContaining({ acquisition_scope: 'explicit', count: 3 }),
    ]))
    expect((await quota().getStatus()).called).toBe(8)
  })

  it('keeps global HIGH and LOW protection even when a scope has capacity', async () => {
    await db.execute(sql`INSERT INTO nearbook.api_usage(provider,endpoint,status_code,cached_hit,created_at)
      SELECT 'jeongbonaru','/fixture',200,false,now() AT TIME ZONE 'UTC' FROM generate_series(1,475)`)
    await expect(quota(500, 500).acquire('jeongbonaru', 'LOW', '/fixture', 'refresh')).rejects.toThrow('API_LIMIT_EXCEEDED')
    for (let i = 0; i < 25; i++) await quota(500, 500).acquire('jeongbonaru', 'HIGH', '/fixture', 'explicit')
    await expect(quota(500, 500).acquire('jeongbonaru', 'HIGH', '/fixture', 'explicit')).rejects.toThrow('API_LIMIT_EXCEEDED')
  })

  it('enforces the configured default of 50 explicit reservations for distinct books under contention', async () => {
    const defaults = () => new QuotaService(new ConfigService())
    const attempts = await Promise.allSettled(Array.from({ length: 60 }, (_, i) =>
      defaults().acquire('jeongbonaru', 'HIGH', `/fixture-${i}`, 'explicit')))
    expect(attempts.filter((r) => r.status === 'fulfilled')).toHaveLength(50)
    const status = await defaults().getStatus()
    expect(status.budgets.explicit).toEqual({ called: 50, limit: 50 })
    expect(status.budgets.refresh).toEqual({ called: 0, limit: 100 })
    await expect(defaults().acquire('jeongbonaru', 'LOW', '/fixture', 'ssr')).rejects.toThrow('API_LIMIT_EXCEEDED')
    const enabled = () => new QuotaService(new ConfigService({ JEONGBONARU_SSR_DAILY_LIMIT: 2 }))
    const optional = await Promise.allSettled(Array.from({ length: 10 }, () =>
      enabled().acquire('jeongbonaru', 'LOW', '/fixture', 'ssr')))
    expect(optional.filter((r) => r.status === 'fulfilled')).toHaveLength(2)
    expect((await enabled().getStatus()).budgets.ssr).toEqual({ called: 2, limit: 2 })
  })

  it('uses KST boundaries and retains failures/unresolved scope usage across restart', async () => {
    await db.execute(sql`INSERT INTO nearbook.api_usage(provider,endpoint,status_code,cached_hit,created_at,acquisition_scope)
      VALUES ('jeongbonaru','/fixture',500,false,date_trunc('day', now() AT TIME ZONE 'Asia/Seoul')-interval '9 hours 1 second','explicit'),
      ('jeongbonaru','/fixture',500,false,date_trunc('day', now() AT TIME ZONE 'Asia/Seoul')-interval '9 hours','explicit'),
      ('jeongbonaru','/fixture',0,false,now() AT TIME ZONE 'UTC','explicit')`)
    await quota().acquire('jeongbonaru', 'HIGH', '/fixture', 'explicit')
    await expect(quota().acquire('jeongbonaru', 'HIGH', '/fixture', 'explicit')).rejects.toThrow('API_LIMIT_EXCEEDED')
    expect((await quota().getStatus()).called).toBe(3)
  })

  it('limits the authenticated account across instances instead of trusting IP/UA headers', async () => {
    const attempts = await Promise.allSettled(Array.from({ length: 15 }, () => new BookAcquisitionLimiter().check('fixture-account')))
    expect(attempts.filter((r) => r.status === 'fulfilled')).toHaveLength(3)
    await db.execute(sql`UPDATE nearbook.book_acquisition_attempts SET created_at = now() - interval '2 minutes'`)
    for (let i = 0; i < 7; i++) {
      await new BookAcquisitionLimiter().check('fixture-account')
      await db.execute(sql`UPDATE nearbook.book_acquisition_attempts SET created_at = now() - interval '2 minutes'`)
    }
    await expect(new BookAcquisitionLimiter().check('fixture-account')).rejects.toMatchObject({ status: 429 })
    await new BookAcquisitionLimiter().check('another-account')
  })
})
