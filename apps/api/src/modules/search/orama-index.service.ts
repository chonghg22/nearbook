import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  ServiceUnavailableException,
} from '@nestjs/common'
import { create, insertMultiple, search, upsert, getByID, remove } from '@orama/orama'
import type { AnyOrama } from '@orama/orama'
import { koreanTokenizer } from './korean-tokenizer'
import { IndexBook, SearchIndexRepository } from './search-index.repository'
import { resolveSearchInput, searchIsbnAliases, type SearchType } from '@nearbook/shared-types'
import { bookMatchRank } from './search-ranking'

const SCHEMA = {
  isbn: 'string',
  title: 'string',
  author: 'string',
  publisher: 'string',
  category: 'string',
  coverUrl: 'string',
  publishedYear: 'number',
  popularityScore: 'number',
} as const

@Injectable()
export class OramaIndexService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OramaIndexService.name)
  private index: AnyOrama | null = null
  private scores = new Map<string, number>()
  private popularityPeriod: string | null = null
  private indexRevision = 0
  get revision(): number {
    return this.indexRevision
  }
  private documents = 0
  private writerTail: Promise<unknown> = Promise.resolve()
  private activeTail: Promise<unknown> = Promise.resolve()
  private pendingWrites = 0
  private rebuildTask: Promise<void> | null = null
  private reconcileTask: Promise<void> | null = null
  private cursor = ''
  private sweepCount = 0
  private lastSweepAt: string | null = null
  private lastRebuild: {
    state: string
    startedAt: string
    endedAt?: string
    count?: number
    durationMs?: number
  } | null = null
  private lastSync: { state: string; count: number; endedAt: string } | null = null

  constructor(private readonly source: SearchIndexRepository) {}

  async onApplicationBootstrap() {
    await this.fullRebuild()
  }

  // Rebuilds queue with writers, but NOT readers. Reads keep the complete old
  // generation until the repeatable-read snapshot commits and swaps atomically.
  fullRebuild(): Promise<void> {
    if (this.rebuildTask) return this.rebuildTask
    this.rebuildTask = this.write(async () => {
      const started = Date.now()
      this.lastRebuild = { state: 'running', startedAt: new Date(started).toISOString() }
      try {
        const built = await this.source.snapshot(async (reader) => {
          const popularity = await this.source.popularity(reader)
          const index = create({
            schema: SCHEMA,
            components: { tokenizer: { ...koreanTokenizer, normalizationCache: new Map() } },
          })
          let after = ''
          let total = 0
          while (true) {
            const rows = await this.source.page(after, 500, reader)
            if (!rows.length) break
            this.assertPage(rows, after)
            await insertMultiple(
              index,
              rows.map((row) => this.toDoc(row, popularity.scores)),
              100
            )
            total += rows.length
            after = rows[rows.length - 1].isbn
            await new Promise<void>((resolve) => setImmediate(resolve))
          }
          return { index, total, ...popularity }
        })
        await this.active(async () => {
          this.index = built.index
          this.documents = built.total
          this.scores = built.scores
          this.popularityPeriod = built.period
          this.cursor = ''
          this.indexRevision++
        })
        this.lastRebuild = {
          ...this.lastRebuild,
          state: 'success',
          count: built.total,
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - started,
        }
        this.logger.log(`Rebuilt and swapped ${built.total} public metadata documents`)
      } catch {
        this.lastRebuild = {
          ...this.lastRebuild,
          state: 'failed',
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - started,
        }
        this.logger.warn('Search rebuild failed; retaining the previous generation')
        throw new ServiceUnavailableException('Search index rebuild is temporarily unavailable')
      }
    }).finally(() => {
      this.rebuildTask = null
    })
    return this.rebuildTask
  }

  async upsertOne(book: IndexBook) {
    await this.upsertMany([book])
  }

  async upsertMany(books: IndexBook[]) {
    if (!books.length) return
    if (books.length > 500) throw new Error('Search update batch exceeds 500 documents')
    const isbns = [...new Set(books.map((book) => book.isbn))]
    await this.write(async () => {
      // Delayed provider responses/queued cron work cannot roll back newer DB
      // metadata or invent an unpersisted document/popularity value.
      const canonical = await this.source.byIsbns(isbns)
      if (canonical.length !== isbns.length) throw new Error('Search metadata is not fully stored')
      await this.applyRows(canonical)
    })
  }

  // cached_at is an application timestamp, NOT a commit-ordered change feed.
  // A bounded, cyclic PK scan replays every row, including late commits and
  // inserts behind the cursor on the next sweep. No five-minute/500-row gap.
  reconcile(): Promise<void> {
    if (this.reconcileTask) return this.reconcileTask
    this.reconcileTask = this.write(async () => {
      let applied = 0
      try {
        for (let page = 0; page < 4; page++) {
          const rows = await this.source.page(this.cursor, 500)
          this.assertPage(rows, this.cursor)
          if (rows.length) {
            await this.applyRows(rows)
            this.cursor = rows[rows.length - 1].isbn // advance ONLY after successful application
            applied += rows.length
          }
          if (rows.length < 500) {
            this.cursor = ''
            this.sweepCount++
            this.lastSweepAt = new Date().toISOString()
            break
          }
        }
        this.lastSync = { state: 'success', count: applied, endedAt: new Date().toISOString() }
      } catch {
        this.lastSync = { state: 'failed', count: applied, endedAt: new Date().toISOString() }
        throw new ServiceUnavailableException('Search reconciliation is temporarily unavailable')
      }
    }).finally(() => {
      this.reconcileTask = null
    })
    return this.reconcileTask
  }

  getStatus() {
    return {
      strategy: 'database-rebuild-on-start',
      ready: this.index !== null,
      revision: this.indexRevision,
      documents: this.documents,
      pendingWrites: this.pendingWrites,
      popularityPeriod: this.popularityPeriod,
      lastRebuild: this.lastRebuild,
      reconciliation: {
        strategy: 'cyclic-primary-key-replay',
        pageSize: 500,
        maxPagesPerRun: 4,
        cursorInProgress: this.cursor !== '',
        completedSweeps: this.sweepCount,
        lastSweepAt: this.lastSweepAt,
        lastRun: this.lastSync,
      },
      evidence: 'current-process-only; source DB is authoritative; no disk restore',
    }
  }

  private write<T>(task: () => Promise<T>): Promise<T> {
    if (this.pendingWrites >= 32)
      return Promise.reject(new ServiceUnavailableException('Search update queue is full'))
    this.pendingWrites++
    const next = this.writerTail.then(task).finally(() => {
      this.pendingWrites--
    })
    this.writerTail = next.catch(() => {})
    return next
  }

  private active<T>(task: () => Promise<T>): Promise<T> {
    const next = this.activeTail.then(task)
    this.activeTail = next.catch(() => {})
    return next
  }

  private async applyRows(rows: IndexBook[]) {
    // Keep each read exclusion short; unchanged documents do not churn tokens,
    // popularity or response-cache revisions during reconciliation.
    for (let offset = 0; offset < rows.length; offset += 100) {
      const docs = rows.slice(offset, offset + 100).map((row) => this.toDoc(row, this.scores))
      await this.active(async () => {
        if (!this.index) throw new ServiceUnavailableException('Search is not ready')
        const index = this.index
        let changed = false
        try {
          for (const doc of docs) {
            const existing = await getByID(index, doc.id)
            if (existing && JSON.stringify(existing) === JSON.stringify(doc)) continue
            changed = true
            try {
              await upsert(index, doc)
            } catch {
              // Restore a failed remove/insert update; never mask an upsert
              // error by blindly inserting a duplicate.
              try {
                if (existing) await upsert(index, existing)
                else await remove(index, doc.id)
              } catch {
                // A damaged live generation is NOT a trustworthy empty index.
                this.index = null
              }
              throw new Error('Search document update failed')
            }
            if (!existing) this.documents++
          }
        } finally {
          if (changed) this.indexRevision++
        }
      })
      await new Promise<void>((resolve) => setImmediate(resolve))
    }
  }

  private assertPage(rows: IndexBook[], after: string) {
    const seen = new Set([after])
    for (const row of rows) {
      // Ordering/cursor comparisons belong to PostgreSQL's SAME PK collation;
      // do not introduce a conflicting JS/C collation or defeat the PK index.
      if (!/^[0-9Xx]{10,20}$/.test(row.isbn) || seen.has(row.isbn))
        throw new Error('Invalid search scan ordering')
      seen.add(row.isbn)
    }
  }

  async query(args: {
    q: string
    limit: number
    offset: number
    category?: string
    sort?: 'relevance' | 'popular' | 'recent'
    searchType?: SearchType
  }) {
    const input = resolveSearchInput(args.q, args.searchType)
    if (!input.q || input.invalidIsbn) return { hits: [], total: 0, elapsedMs: '0ms' }
    const sortBy =
      args.sort === 'recent'
        ? { property: 'publishedYear' as const, order: 'DESC' as const }
        : args.sort === 'popular'
          ? { property: 'popularityScore' as const, order: 'DESC' as const }
          : undefined

    const where: Record<string, any> = {}
    if (args.category) where.category = args.category

    // ISBN 검색은 exact match로 처리
    if (input.searchType === 'isbn') {
      where.isbn = searchIsbnAliases(input.q)
    }

    // searchType에 따라 검색 대상 필드 결정
    const searchProps =
      input.searchType === 'isbn'
        ? (['isbn'] as const)
        : input.searchType === 'author'
          ? (['author'] as const)
          : input.searchType === 'publisher'
            ? (['publisher'] as const)
            : input.searchType === 'title'
              ? (['title'] as const)
              : (['title', 'author', 'publisher'] as const)

    const boost =
      input.searchType === 'author'
        ? { author: 2.0 }
        : input.searchType === 'publisher'
          ? { publisher: 2.0 }
          : { title: 2.0, author: 1.5 }

    // 한글은 bigram 토크나이저 특성상 fuzzy 매칭 시 무관한 결과 다수 발생 — 전면 비활성화
    const isKorean = /[가-힣]/.test(input.q)
    const tolerance = isKorean ? 0 : 1
    const ranks = new Map<string, number>()
    const rank = (book: { isbn: string; title: string; author: string; publisher: string }) => {
      const cached = ranks.get(book.isbn)
      if (cached !== undefined) return cached
      const value = bookMatchRank(book, input.q, input.searchType)
      ranks.set(book.isbn, value)
      return value
    }

    const result = await this.active(async () => {
      if (!this.index) throw new ServiceUnavailableException('Search is not ready')
      return search(this.index, {
        term: input.searchType === 'isbn' ? '' : input.q,
        limit: args.limit,
        offset: args.offset,
        ...(Object.keys(where).length > 0 && { where }),
        sortBy:
          sortBy ??
          ((a, b) => {
            const first = a[2] as unknown as {
              isbn: string
              title: string
              author: string
              publisher: string
            }
            const second = b[2] as unknown as typeof first
            return (
              rank(first) - rank(second) || b[1] - a[1] || first.isbn.localeCompare(second.isbn)
            )
          }),
        tolerance,
        properties: searchProps as any,
        boost,
      })
    })

    return {
      hits: result.hits.map((h) => h.document),
      total: result.count,
      elapsedMs: result.elapsed.formatted,
    }
  }

  private toDoc(row: IndexBook, scores: Map<string, number>) {
    if (!/^[0-9Xx]{10,20}$/.test(row.isbn) || typeof row.title !== 'string')
      throw new Error('Invalid search document')
    for (const value of [row.author, row.publisher, row.category, row.coverUrl]) {
      if (value != null && typeof value !== 'string') throw new Error('Invalid search metadata')
    }
    if (row.publishedYear != null && !Number.isFinite(row.publishedYear))
      throw new Error('Invalid publication year')
    return {
      id: row.isbn,
      isbn: row.isbn,
      title: row.title ?? '',
      author: row.author ?? '',
      publisher: row.publisher ?? '',
      category: row.category ?? '',
      coverUrl: row.coverUrl ?? '',
      publishedYear: row.publishedYear ?? 0,
      popularityScore: scores.get(row.isbn) ?? 0,
    }
  }
}
