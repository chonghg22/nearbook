// Only an explicitly supplied, isolated localhost test DB is allowed. No application .env is read.
jest.mock('@nearbook/db', () => {
  const { sql, eq } = jest.requireActual('drizzle-orm')
  const url = process.env.NEARBOOK_QUOTA_TEST_DATABASE_URL
  if (!url) return { db: {}, sql, eq }
  const target = new URL(url)
  if (
    !['127.0.0.1', 'localhost'].includes(target.hostname) ||
    target.pathname !== '/nearbook_quota_test'
  ) {
    throw new Error(
      'Quota integration tests require the isolated localhost nearbook_quota_test database'
    )
  }
  const fromDb = jest.requireActual('node:module').createRequire(require.resolve('@nearbook/db'))
  const postgres = fromDb('postgres')
  const { drizzle } = jest.requireActual('drizzle-orm/postgres-js')
  const { pgSchema, serial, integer } = jest.requireActual('drizzle-orm/pg-core')
  const apiUsage = pgSchema('nearbook').table('api_usage', {
    id: serial('id').primaryKey(),
    statusCode: integer('status_code'),
    durationMs: integer('duration_ms'),
  })
  const client = postgres(url, { max: 10, prepare: false })
  return { db: drizzle(client), apiUsage, sql, eq, __testClient: client }
})

import { ConfigService } from '@nestjs/config'
import { db, sql } from '@nearbook/db'
import { QuotaService } from './quota.service'
import { QuotaBlockedError } from './quota.errors'
import { OperationsController } from '../operations/operations.controller'
import { JobStatusService } from '../operations/job-status.service'
import { SchedulerRegistry } from '@nestjs/schedule'

const suite = process.env.NEARBOOK_QUOTA_TEST_DATABASE_URL ? describe : describe.skip
suite('durable quota: actual isolated PostgreSQL transactions', () => {
  const config = (limit = 500) => new ConfigService({ JEONGBONARU_DAILY_LIMIT: String(limit) })
  let quota: QuotaService
  beforeAll(async () => {
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS nearbook`)
    await db.execute(sql`CREATE TABLE IF NOT EXISTS nearbook.api_usage (
      id serial PRIMARY KEY, provider varchar(32) NOT NULL, endpoint varchar(128) NOT NULL,
      status_code integer, cached_hit boolean NOT NULL DEFAULT false, duration_ms integer,
      created_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'))`)
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS quota_test_provider_created_idx ON nearbook.api_usage(provider, created_at)`
    )
    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS nearbook.home_curations (section text, period_key text, fetched_at timestamp)`
    )
    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS nearbook.category_curations (period_key text, fetched_at timestamp)`
    )
    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS nearbook.library_curations (section text, period_key text, fetched_at timestamp)`
    )
  })
  beforeEach(async () => {
    await db.execute(sql`TRUNCATE nearbook.api_usage RESTART IDENTITY`)
    quota = new QuotaService(config())
  })
  afterAll(async () => {
    await jest.requireMock('@nearbook/db').__testClient.end({ timeout: 2 })
  })

  it('makes exactly one reservation and updates that row, never adding a second error/success log', async () => {
    const id = await quota.acquire('jeongbonaru', 'HIGH', '/bookExist')
    expect(await quota.getStatus()).toMatchObject({ called: 1, unresolved: 1, succeeded: 0 })
    await quota.complete(id, 422, 8)
    expect(await quota.getStatus()).toMatchObject({
      called: 1,
      unresolved: 0,
      failed: 1,
      succeeded: 0,
    })
    await quota.complete(id, 200, 9)
    expect(await quota.getStatus()).toMatchObject({ called: 1, succeeded: 1, failed: 0 })
  })
  it('persists failed, timed out and unresolved reservations across new service instances', async () => {
    for (const code of [200, 500, 429, 0]) {
      const id = await quota.acquire('jeongbonaru', 'HIGH', '/bookExist')
      if (code) await quota.complete(id, code, 1)
    }
    const restarted = new QuotaService(config())
    expect(restarted.getLocalStatus()).toMatchObject({ called: null, mode: 'unknown' })
    expect(await restarted.getStatus()).toMatchObject({
      called: 4,
      succeeded: 1,
      failed: 2,
      unresolved: 1,
      remaining: 496,
    })
  })
  it('serializes 20 racing reservations across two service instances without overspending a five-call budget', async () => {
    const peers = [new QuotaService(config(5)), new QuotaService(config(5))]
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) =>
        peers[i % 2].acquire('jeongbonaru', 'HIGH', '/bookExist')
      )
    )
    expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(5)
    for (const result of results)
      if (result.status === 'rejected') expect(result.reason).toBeInstanceOf(QuotaBlockedError)
    expect(await peers[0].getStatus()).toMatchObject({ called: 5, remaining: 0, mode: 'blocked' })
  })
  it('stops LOW at 475 but leaves exactly 25 calls for HIGH, then blocks all at 500', async () => {
    await db.execute(sql`INSERT INTO nearbook.api_usage(provider, endpoint, status_code)
      SELECT 'jeongbonaru', '/bookExist', 200 FROM generate_series(1, 474)`)
    await quota.acquire('jeongbonaru', 'LOW', '/loanItemSrch')
    await expect(quota.acquire('jeongbonaru', 'LOW', '/loanItemSrch')).rejects.toMatchObject({
      reason: 'QUOTA_BLOCKED_LOW',
    })
    await Promise.all(
      Array.from({ length: 25 }, () => quota.acquire('jeongbonaru', 'HIGH', '/bookExist'))
    )
    await expect(quota.acquire('jeongbonaru', 'HIGH', '/bookExist')).rejects.toMatchObject({
      reason: 'QUOTA_BLOCKED_ALL',
    })
    expect(await quota.getStatus()).toMatchObject({ called: 500, remaining: 0 })
  })
  it('uses exact KST midnight bounds and excludes cached hits and other providers', async () => {
    await db.execute(sql`INSERT INTO nearbook.api_usage(provider, endpoint, status_code, cached_hit, created_at) VALUES
      ('jeongbonaru', '/bookExist', 200, false, date_trunc('day', statement_timestamp() AT TIME ZONE 'Asia/Seoul') - interval '9 hours' - interval '1 millisecond'),
      ('jeongbonaru', '/bookExist', 200, false, date_trunc('day', statement_timestamp() AT TIME ZONE 'Asia/Seoul') - interval '9 hours'),
      ('jeongbonaru', '/bookExist', 200, false, date_trunc('day', statement_timestamp() AT TIME ZONE 'Asia/Seoul') + interval '15 hours'),
      ('jeongbonaru', '/bookExist', 200, true, now() AT TIME ZONE 'UTC'),
      ('other', '/bookExist', 200, false, now() AT TIME ZONE 'UTC')`)
    const status = await quota.getStatus()
    expect(status).toMatchObject({ called: 1, succeeded: 1, timezone: 'Asia/Seoul' })
    expect(new Date(status.resetAt).getTime()).toBeGreaterThan(Date.now())
    expect(status.resetAt.endsWith('T15:00:00.000Z')).toBe(true)
  })
  it('caps misconfigured 30000 at the owner-confirmed 500 and does not invent new quota', async () => {
    const status = await new QuotaService(config(30000)).getStatus()
    expect(status).toMatchObject({
      limit: 500,
      accountLimit: 500,
      configuredLimit: 30000,
      limitClamped: true,
    })
  })
  it('returns no budget for an already over-budget legacy day without deleting old usage', async () => {
    await db.execute(sql`INSERT INTO nearbook.api_usage(provider, endpoint, status_code)
      SELECT 'jeongbonaru', '/bookExist', 200 FROM generate_series(1, 501)`)
    expect(await quota.getStatus()).toMatchObject({ called: 501, remaining: 0, mode: 'blocked' })
    await expect(quota.acquire('jeongbonaru', 'HIGH', '/bookExist')).rejects.toThrow(
      'API_LIMIT_EXCEEDED'
    )
    expect((await quota.getStatus()).called).toBe(501)
  })
  it('does not refund budget if the provider result was lost before completion', async () => {
    await quota.acquire('jeongbonaru', 'HIGH', '/bookExist')
    await quota.acquire('jeongbonaru', 'HIGH', '/bookExist')
    expect(await quota.getStatus()).toMatchObject({ called: 2, unresolved: 2, remaining: 498 })
  })
  it('executes the real operational snapshot query and distinguishes latest-period rows from runtime completion', async () => {
    await db.execute(
      sql`TRUNCATE nearbook.home_curations, nearbook.category_curations, nearbook.library_curations`
    )
    await db.execute(sql`INSERT INTO nearbook.home_curations VALUES
      ('loan_item_books', '2026-10-14', '2026-10-14 03:10:00'),
      ('loan_item_books', '2026-10-15', '2026-10-15 03:10:00'),
      ('loan_item_books', '2026-10-15', '2026-10-15 03:11:00')`)
    await db.execute(
      sql`INSERT INTO nearbook.category_curations VALUES ('2026-10', '2026-10-15 03:35:00')`
    )
    await db.execute(
      sql`INSERT INTO nearbook.library_curations VALUES ('new_arrivals', '2026-10', '2026-10-15 03:40:00')`
    )
    const result = await new OperationsController(
      quota,
      new JobStatusService(),
      new SchedulerRegistry()
    ).status()
    expect(result.quota).toMatchObject({ called: 0, limit: 500 })
    expect(result.snapshots).toHaveLength(3)
    expect(result.snapshots).toContainEqual(
      expect.objectContaining({
        section: 'home:loan_item_books',
        period_key: '2026-10-15',
        count: 2,
      })
    )
    expect(result.jobs.every((job) => !job.registered && job.lastRun === null)).toBe(true)
    expect(result.evidence.snapshots).toBe('stored-rows-not-proof-of-a-complete-job')
  })
})
