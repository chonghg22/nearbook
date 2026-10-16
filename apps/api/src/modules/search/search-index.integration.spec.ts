// Explicit isolated localhost DB only; never loads application .env or providers.
jest.mock('@nearbook/db', () => {
  const { sql } = jest.requireActual('drizzle-orm')
  const url = process.env.NEARBOOK_QUOTA_TEST_DATABASE_URL
  if (!url) return { db: {}, sql }
  const target = new URL(url)
  if (
    !['127.0.0.1', 'localhost'].includes(target.hostname) ||
    target.pathname !== '/nearbook_quota_test'
  ) {
    throw new Error('Search integration requires isolated localhost nearbook_quota_test')
  }
  const fromDb = jest.requireActual('node:module').createRequire(require.resolve('@nearbook/db'))
  const client = fromDb('postgres')(url, { max: 5, prepare: false })
  return {
    db: jest.requireActual('drizzle-orm/postgres-js').drizzle(client),
    sql,
    __testClient: client,
  }
})

import { db, sql } from '@nearbook/db'
import { SearchIndexRepository } from './search-index.repository'
import { OramaIndexService } from './orama-index.service'

const suite = process.env.NEARBOOK_QUOTA_TEST_DATABASE_URL ? describe : describe.skip
suite('actual PostgreSQL + Orama: snapshot, replay and restart consistency', () => {
  const source = new SearchIndexRepository()
  const query = { q: '검증', limit: 10, offset: 0, sort: 'popular' as const }
  beforeAll(async () => {
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS nearbook`)
    await db.execute(sql`CREATE TABLE IF NOT EXISTS nearbook.book_cache (
      isbn varchar(20) PRIMARY KEY, title varchar(512) NOT NULL, author varchar(256),
      publisher varchar(128), category varchar(64), cover_url varchar(512), published_year integer)`)
    await db.execute(sql`CREATE TABLE IF NOT EXISTS nearbook.popular_books (
      id serial PRIMARY KEY, isbn varchar(20) NOT NULL, region varchar(64) NOT NULL,
      period varchar(16) NOT NULL, rank integer NOT NULL)`)
  })
  beforeEach(async () => {
    await db.execute(sql`TRUNCATE nearbook.book_cache, nearbook.popular_books`)
    await db.execute(sql`INSERT INTO nearbook.book_cache(isbn,title,author,cover_url,published_year)
      VALUES ('9780000000001','검증 하나','저자','https://example.test/cover',2026),
      ('9780000000002','검증 둘',NULL,NULL,NULL)`)
  })
  afterAll(async () => {
    await jest.requireMock('@nearbook/db').__testClient.end({ timeout: 2 })
  })

  it('uses keyset ordering, canonical column aliases and parameterized ISBN selection', async () => {
    const page = await source.page('', 1)
    expect(page[0]).toMatchObject({
      isbn: '9780000000001',
      coverUrl: 'https://example.test/cover',
      publishedYear: 2026,
    })
    expect((await source.page(page[0].isbn, 1))[0].isbn).toBe('9780000000002')
    expect(await source.byIsbns(["x'); DROP TABLE nearbook.book_cache;--"])).toEqual([])
    expect(await source.byIsbns([])).toEqual([])
    expect(await source.byIsbns(['9780000000001'])).toHaveLength(1)
  })
  it('only uses the latest nationwide period, deterministically merges duplicate ranks and ignores invalid ranks', async () => {
    await db.execute(sql`INSERT INTO nearbook.popular_books(isbn,region,period,rank) VALUES
      ('9780000000001','전국','2026-09',1), ('9780000000001','전국','2026-10',8),
      ('9780000000001','전국','2026-10',3), ('9780000000002','서울','2026-11',1),
      ('9780000000002','전국','2026-10',0)`)
    const popular = await source.snapshot((reader) => source.popularity(reader))
    expect(popular.period).toBe('2026-10')
    expect([...popular.scores]).toEqual([['9780000000001', 9998]])
  })
  it('one repeatable-read snapshot cannot mix concurrent metadata/popularity commits', async () => {
    await source.snapshot(async (reader) => {
      expect(await source.page('', 1, reader)).toHaveLength(1)
      await db.execute(
        sql`INSERT INTO nearbook.book_cache(isbn,title) VALUES ('9780000000003','검증 늦은 커밋')`
      )
      await db.execute(sql`INSERT INTO nearbook.popular_books(isbn,region,period,rank)
        VALUES ('9780000000003','전국','2026-10',1)`)
      expect(await source.page('9780000000002', 10, reader)).toEqual([])
      expect((await source.popularity(reader)).scores.size).toBe(0)
    })
    expect(await source.page('9780000000002', 10)).toHaveLength(1)
    expect((await source.snapshot((reader) => source.popularity(reader))).scores.size).toBe(1)
  })
  it('a restarted process and full rebuild preserve ranking, ordinary upserts cannot erase it', async () => {
    await db.execute(sql`INSERT INTO nearbook.popular_books(isbn,region,period,rank)
      VALUES ('9780000000002','전국','2026-10',2)`)
    const service = new OramaIndexService(source)
    await service.onApplicationBootstrap()
    expect((await service.query(query)).hits[0]).toMatchObject({
      isbn: '9780000000002',
      popularityScore: 9999,
    })
    await db.execute(
      sql`UPDATE nearbook.book_cache SET title='검증 새 제목' WHERE isbn='9780000000002'`
    )
    await service.upsertOne({
      isbn: '9780000000002',
      title: '무시할 오래된 응답',
      popularityScore: 0,
    })
    expect((await service.query(query)).hits[0]).toMatchObject({
      title: '검증 새 제목',
      popularityScore: 9999,
    })
    const restarted = new OramaIndexService(source)
    await restarted.onApplicationBootstrap()
    expect((await restarted.query(query)).hits).toEqual((await service.query(query)).hits)
    await service.fullRebuild()
    expect((await restarted.query(query)).hits).toEqual((await service.query(query)).hits)
  })
  it('reconciles >500 persisted rows without a cached_at time-window or silent truncation', async () => {
    const service = new OramaIndexService(source)
    await service.fullRebuild()
    await db.execute(sql`INSERT INTO nearbook.book_cache(isbn,title)
      SELECT (9780000000010 + n)::text, '검증 대량 도서' FROM generate_series(1,1200) n`)
    await service.reconcile()
    expect((await service.query(query)).total).toBe(1202)
    expect(service.getStatus().reconciliation.completedSweeps).toBe(1)
    const revision = service.revision
    await service.reconcile()
    expect(service.revision).toBe(revision)
  }, 20000)
  it('removed popularity and deleted metadata are cleared by a subsequent atomic rebuild', async () => {
    await db.execute(sql`INSERT INTO nearbook.popular_books(isbn,region,period,rank)
      VALUES ('9780000000001','전국','2026-10',1)`)
    const service = new OramaIndexService(source)
    await service.fullRebuild()
    await db.execute(sql`DELETE FROM nearbook.popular_books`)
    await db.execute(sql`DELETE FROM nearbook.book_cache WHERE isbn='9780000000002'`)
    await service.fullRebuild()
    const result = await service.query(query)
    expect(result.total).toBe(1)
    expect(result.hits[0]).toMatchObject({ isbn: '9780000000001', popularityScore: 0 })
  })
})
