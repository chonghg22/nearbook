import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule'
import request from 'supertest'
import { OramaIndexService } from './orama-index.service'
import { SearchIndexRepository, IndexBook } from './search-index.repository'
import { SearchIndexModule } from './search-index.module'
import { SearchSyncCron } from './search-sync.cron'
import { CommonModule } from '../../common/common.module'
import { CacheModule } from '../../common/cache/cache.module'
import { CacheService } from '../../common/cache/cache.service'
import { CacheService as LegacyCacheService } from '../../common/cache.service'
import { AppModule } from '../../app.module'
import { AladdinFallbackService } from './aladdin-fallback.service'
import { JeongbonaruService } from '../jeongbonaru/jeongbonaru.service'
import * as orama from '@orama/orama'

jest.mock('@nearbook/db', () => ({
  db: { insert: jest.fn(() => ({ values: () => Promise.resolve() })) },
  sql: jest.fn(),
}))
const book = (id: number, title = '테스트 도서'): IndexBook => ({
  isbn: String(9780000000000 + id),
  title,
  publishedYear: 2026,
})
const query = { q: '테스트', limit: 5000, offset: 0 }
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
function fixture(initial = [book(1), book(2)]) {
  let rows = initial
  let scores = new Map([[book(1).isbn, 100]])
  const source = {
    snapshot: jest.fn(async (read: (reader: unknown) => Promise<unknown>) => read({})),
    popularity: jest.fn(async () => ({ period: '2026-10', scores: new Map(scores) })),
    page: jest.fn(async (after: string, limit: number) =>
      rows
        .filter((row) => row.isbn > after)
        .sort((a, b) => a.isbn.localeCompare(b.isbn))
        .slice(0, limit)
    ),
    byIsbns: jest.fn(async (ids: string[]) => rows.filter((row) => ids.includes(row.isbn))),
  }
  return {
    source,
    service: new OramaIndexService(source as unknown as SearchIndexRepository),
    store: (next: IndexBook[]) => {
      rows = next
    },
    scores: (next: Map<string, number>) => {
      scores = next
    },
  }
}

describe('real Orama: generation swaps, canonical writes and replay', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  it('fails closed before initial build and does not create a fake empty success on bootstrap failure', async () => {
    const { service, source } = fixture()
    await expect(service.query(query)).rejects.toMatchObject({ status: 503 })
    source.popularity.mockRejectedValueOnce(new Error('SECRET database'))
    await expect(service.onApplicationBootstrap()).rejects.toMatchObject({ status: 503 })
    expect(service.getStatus()).toMatchObject({ ready: false, lastRebuild: { state: 'failed' } })
    expect(JSON.stringify(service.getStatus())).not.toContain('SECRET')
  })
  it('serves the complete old generation while a rebuild is paused; swaps only when complete', async () => {
    const f = fixture()
    await f.service.fullRebuild()
    const revision = f.service.revision
    f.store([book(3)])
    const gate = deferred()
    const entered = deferred()
    f.source.page.mockImplementationOnce(async () => {
      entered.resolve()
      await gate.promise
      return [book(3)]
    })
    const rebuilding = f.service.fullRebuild()
    await entered.promise
    expect((await f.service.query(query)).total).toBe(2)
    expect(f.service.revision).toBe(revision)
    gate.resolve()
    await rebuilding
    expect((await f.service.query(query)).hits.map((b) => b.isbn)).toEqual([book(3).isbn])
    expect(f.service.revision).toBe(revision + 1)
  })
  it('a failed second page never replaces the old complete generation or invalidates its revision', async () => {
    const f = fixture()
    await f.service.fullRebuild()
    const revision = f.service.revision
    f.source.page.mockResolvedValueOnce([book(3)]).mockRejectedValueOnce(new Error('DB failed'))
    await expect(f.service.fullRebuild()).rejects.toMatchObject({ status: 503 })
    expect((await f.service.query(query)).total).toBe(2)
    expect(f.service.revision).toBe(revision)
    expect(f.service.getStatus().lastRebuild?.state).toBe('failed')
  })
  it('coalesces overlapping rebuild calls instead of queuing another complete scan', async () => {
    const f = fixture()
    const gate = deferred()
    f.source.page.mockImplementationOnce(async () => {
      await gate.promise
      return [book(1)]
    })
    const first = f.service.fullRebuild()
    expect(f.service.fullRebuild()).toBe(first)
    gate.resolve()
    await first
    expect(f.source.snapshot).toHaveBeenCalledTimes(1)
  })
  it('replays a write queued during rebuild using newer canonical DB data, not its stale input', async () => {
    const f = fixture()
    await f.service.fullRebuild()
    const entered = deferred(),
      gate = deferred()
    f.source.page.mockImplementationOnce(async () => {
      entered.resolve()
      await gate.promise
      return [book(1)]
    })
    const rebuild = f.service.fullRebuild()
    await entered.promise
    const queued = f.service.upsertOne(book(3, '테스트 이전 제목'))
    f.store([book(1), book(3, '테스트 최신 제목')])
    gate.resolve()
    await Promise.all([rebuild, queued])
    expect((await f.service.query(query)).hits).toContainEqual(
      expect.objectContaining({ title: '테스트 최신 제목' })
    )
    expect(f.service.getStatus().pendingWrites).toBe(0)
  })
  it('bounds queued updates and recovers the queue after a rejected canonical lookup', async () => {
    const f = fixture()
    await f.service.fullRebuild()
    const gate = deferred(),
      entered = deferred()
    f.source.page.mockImplementationOnce(async () => {
      entered.resolve()
      await gate.promise
      return []
    })
    const rebuild = f.service.fullRebuild()
    await entered.promise
    const writes = Array.from({ length: 31 }, () => f.service.upsertOne(book(1)))
    await expect(f.service.upsertOne(book(1))).rejects.toMatchObject({ status: 503 })
    gate.resolve()
    await Promise.all([rebuild, ...writes])
    f.source.byIsbns.mockRejectedValueOnce(new Error('DB failure'))
    await expect(f.service.upsertOne(book(1))).rejects.toThrow('DB failure')
    await f.service.upsertOne(book(1))
    expect(f.service.getStatus().pendingWrites).toBe(0)
  })
  it('rejects unpersisted documents rather than indexing provider-only records', async () => {
    const f = fixture()
    await f.service.fullRebuild()
    await expect(f.service.upsertOne(book(999))).rejects.toThrow('not fully stored')
    expect((await f.service.query(query)).total).toBe(2)
  })
  it('keeps popularity after metadata updates and resets removed ranks on rebuild/restart', async () => {
    const f = fixture()
    await f.service.fullRebuild()
    f.store([book(1, '테스트 변경'), book(2)])
    await f.service.upsertMany([{ ...book(1), popularityScore: 0 } as IndexBook])
    expect((await f.service.query({ ...query, sort: 'popular' })).hits[0]).toMatchObject({
      isbn: book(1).isbn,
      popularityScore: 100,
    })
    f.scores(new Map([[book(2).isbn, 200]]))
    await f.service.fullRebuild()
    expect((await f.service.query({ ...query, sort: 'popular' })).hits[0]).toMatchObject({
      isbn: book(2).isbn,
      popularityScore: 200,
    })
    expect(
      (await f.service.query(query)).hits.find((b) => b.isbn === book(1).isbn)?.popularityScore
    ).toBe(0)
    const restarted = new OramaIndexService(f.source as unknown as SearchIndexRepository)
    await restarted.onApplicationBootstrap()
    expect((await restarted.query({ ...query, sort: 'popular' })).hits).toEqual(
      (await f.service.query({ ...query, sort: 'popular' })).hits
    )
  })
  it('unchanged cyclic replays do not churn the response-cache revision', async () => {
    const f = fixture()
    await f.service.fullRebuild()
    const revision = f.service.revision
    await f.service.reconcile()
    expect(f.service.revision).toBe(revision)
    expect(f.service.getStatus().reconciliation.completedSweeps).toBe(1)
  })
  it('handles >500 updates across bounded runs and late inserts/updates behind the cursor', async () => {
    const f = fixture([])
    await f.service.fullRebuild()
    f.store(Array.from({ length: 2501 }, (_, i) => book(i + 10)))
    await f.service.reconcile()
    expect((await f.service.query(query)).total).toBe(2000)
    expect(f.service.getStatus().reconciliation.cursorInProgress).toBe(true)
    const rows = Array.from({ length: 2501 }, (_, i) => book(i + 10))
    rows[0] = book(10, '테스트 늦은 갱신')
    f.store([book(1, '테스트 늦은 추가'), ...rows])
    await f.service.reconcile()
    expect((await f.service.query(query)).total).toBe(2501)
    expect(f.service.getStatus().reconciliation.cursorInProgress).toBe(false)
    await f.service.reconcile()
    const result = await f.service.query(query)
    expect(result.total).toBe(2502)
    expect(result.hits).toContainEqual(expect.objectContaining({ title: '테스트 늦은 갱신' }))
    expect(result.hits).toContainEqual(expect.objectContaining({ title: '테스트 늦은 추가' }))
  }, 20000)
  it('retains the last successful cursor on failure and retries the same page without duplicates', async () => {
    const f = fixture([])
    await f.service.fullRebuild()
    f.store(Array.from({ length: 600 }, (_, i) => book(i + 1)))
    const page = f.source.page.getMockImplementation()!
    f.source.page.mockImplementationOnce(page).mockRejectedValueOnce(new Error('DB failure'))
    await expect(f.service.reconcile()).rejects.toMatchObject({ status: 503 })
    const failedAt = f.source.page.mock.calls.at(-1)?.[0]
    expect(failedAt).toBe(book(500).isbn)
    await f.service.reconcile()
    expect(f.source.page.mock.calls.at(-1)?.[0]).toBe(failedAt)
    expect((await f.service.query(query)).total).toBe(600)
  })
  it('coalesces overlapping reconciliation and rejects non-advancing source pages', async () => {
    const f = fixture()
    await f.service.fullRebuild()
    const gate = deferred()
    f.source.page.mockImplementationOnce(async () => {
      await gate.promise
      return [book(1), book(1)]
    })
    const first = f.service.reconcile()
    expect(f.service.reconcile()).toBe(first)
    gate.resolve()
    await expect(first).rejects.toMatchObject({ status: 503 })
    expect(f.service.getStatus().reconciliation.lastRun?.state).toBe('failed')
    await f.service.reconcile()
  })
  it('invalid stored metadata cannot corrupt the serving generation during rebuild', async () => {
    const f = fixture()
    await f.service.fullRebuild()
    f.store([{ ...book(1), publishedYear: NaN }])
    await expect(f.service.fullRebuild()).rejects.toMatchObject({ status: 503 })
    expect((await f.service.query(query)).total).toBe(2)
  })
  it('deletions disappear after a source rebuild without a delete feed or disk restore', async () => {
    const f = fixture()
    await f.service.fullRebuild()
    f.store([book(2)])
    await f.service.fullRebuild()
    expect((await f.service.query(query)).hits.map((b) => b.isbn)).toEqual([book(2).isbn])
  })

  it('restores a failed remove/insert upsert without inventing a duplicate or stale cached revision', async () => {
    const f = fixture()
    await f.service.fullRebuild()
    const revision = f.service.revision
    f.store([book(1, '테스트 변경'), book(2)])
    jest.spyOn(orama, 'upsert').mockImplementationOnce(async (index, doc) => {
      await orama.remove(index, String(doc.id))
      throw new Error('injected partial update failure')
    })
    await expect(f.service.upsertOne(book(1))).rejects.toThrow('update failed')
    const result = await f.service.query(query)
    expect(result.total).toBe(2)
    expect(result.hits).toContainEqual(
      expect.objectContaining({ isbn: book(1).isbn, title: '테스트 도서' })
    )
    expect(f.service.revision).toBeGreaterThan(revision)
    await f.service.upsertOne(book(1))
    expect((await f.service.query(query)).hits).toContainEqual(
      expect.objectContaining({ title: '테스트 변경' })
    )
  })

  it('fails closed if rollback is also damaged, then recovers through a fresh rebuild', async () => {
    const f = fixture()
    await f.service.fullRebuild()
    f.store([book(1, '테스트 변경'), book(2)])
    jest.spyOn(orama, 'upsert').mockRejectedValue(new Error('injected failure'))
    await expect(f.service.upsertOne(book(1))).rejects.toThrow('update failed')
    expect(f.service.getStatus().ready).toBe(false)
    await expect(f.service.query(query)).rejects.toMatchObject({ status: 503 })
    jest.restoreAllMocks()
    await f.service.fullRebuild()
    expect((await f.service.query(query)).total).toBe(2)
  })

  it('serves only complete generations under a 20,000-document synthetic rebuild workload', async () => {
    const f = fixture()
    await f.service.fullRebuild()
    f.store(Array.from({ length: 20000 }, (_, i) => book(i + 1)))
    const started = Date.now()
    let done = false
    const rebuild = f.service.fullRebuild().finally(() => {
      done = true
    })
    const times: number[] = []
    const totals = new Set<number>()
    while (!done) {
      const requestAt = Date.now()
      totals.add((await f.service.query({ ...query, limit: 10 })).total)
      times.push(Date.now() - requestAt)
      await new Promise<void>((resolve) => setImmediate(resolve))
    }
    await rebuild
    expect((await f.service.query({ ...query, limit: 10 })).total).toBe(20000)
    expect([...totals].every((total) => total === 2 || total === 20000)).toBe(true)
    console.info(
      'synthetic-index-workload',
      JSON.stringify({
        documents: 20000,
        rebuildMs: Date.now() - started,
        concurrentReads: times.length,
        maxReadMs: Math.max(...times),
        heapMiB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      })
    )
  }, 30000)
})

describe('actual Nest graph: cache singleton, named schedules and aggregate HTTP evidence', () => {
  it('boots the actual application and serves search, health and status from ONE index/cache instance', async () => {
    const f = fixture()
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) =>
          key === 'SUPABASE_JWT_SECRET' ? 'isolated-test-only-not-an-account' : undefined,
      })
      .overrideProvider(SearchIndexRepository)
      .useValue(f.source)
      .overrideProvider(AladdinFallbackService)
      .useValue({ searchAndCache: jest.fn().mockResolvedValue([]) })
      .overrideProvider(JeongbonaruService)
      .useValue({ searchAndCacheBooks: jest.fn().mockResolvedValue({ items: [] }) })
      .compile()
    const app = module.createNestApplication()
    await app.init()
    // Registration is verified, but no natural job may run in this test.
    for (const job of module.get(SchedulerRegistry).getCronJobs().values()) job.stop()
    try {
      const health = await request(app.getHttpServer()).get('/health').expect(200)
      expect(health.body.status).toBe('ok')
      const search = await request(app.getHttpServer())
        .get('/search')
        .query({ q: '테스트', sort: 'popular' })
        .expect(200)
      expect(search.body.data.total).toBe(2)
      expect(search.body.data.items[0]).toMatchObject({ isbn: book(1).isbn, popularityScore: 100 })
      const status = await request(app.getHttpServer()).get('/operations/search').expect(200)
      expect(status.body.index.documents).toBe(2)
      expect(f.source.snapshot).toHaveBeenCalledTimes(1)
      expect(module.get(LegacyCacheService)).toBe(module.get(CacheService))
      await request(app.getHttpServer()).get('/me/wishlists').expect(401)
    } finally {
      await app.close()
    }
  })
  it('shares both cache import paths/modules and exposes only aggregate no-store status', async () => {
    const f = fixture()
    const module = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot(), SearchIndexModule, CommonModule, CacheModule],
      providers: [SearchSyncCron],
    })
      .overrideProvider(SearchIndexRepository)
      .useValue(f.source)
      .compile()
    const app = module.createNestApplication()
    await app.init()
    try {
      expect(LegacyCacheService).toBe(CacheService)
      const cache = module.get(CacheService)
      cache.set('private-never-exposed', { secret: 'SECRET-PAYLOAD' })
      expect(module.get(LegacyCacheService).get('private-never-exposed')).toEqual({
        secret: 'SECRET-PAYLOAD',
      })
      cache.get('missing')
      const response = await request(app.getHttpServer()).get('/operations/search').expect(200)
      expect(response.headers['cache-control']).toBe('no-store')
      expect(response.body.index).toMatchObject({ ready: true, documents: 2 })
      expect(response.body.sharedCache).toMatchObject({ size: 1, hits: 1, misses: 1 })
      expect(response.body.searchJobs.every((job: { registered: boolean }) => job.registered)).toBe(
        true
      )
      expect([...module.get(SchedulerRegistry).getCronJobs().keys()]).not.toContain(
        'search:persist'
      )
      expect(JSON.stringify(response.body)).not.toMatch(/SECRET|private-never|978000/)
    } finally {
      await app.close()
    }
  })
  it('purges expired shared-cache items for status, not exposing keys or expired counts', async () => {
    const cache = new CacheService()
    cache.set('key', 1, 1)
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(cache.getStatus().size).toBe(0)
  })
  it('scheduled errors are contained without provider calls or abandoned promises', async () => {
    const orama = {
      reconcile: jest.fn().mockRejectedValue(new Error('SECRET')),
      fullRebuild: jest.fn().mockRejectedValue(new Error('SECRET')),
    }
    const logger = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
    try {
      const cron = new SearchSyncCron(orama as unknown as OramaIndexService)
      await cron.syncDelta()
      await cron.refreshPopularityScore()
      await cron.weeklyFullRebuild()
      expect(logger.mock.calls.flat().join()).not.toContain('SECRET')
    } finally {
      logger.mockRestore()
    }
  })
})
