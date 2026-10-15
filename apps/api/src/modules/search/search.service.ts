import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { db, searchLogs, sql } from '@nearbook/db'
import { LRUCache } from 'lru-cache'
import { OramaIndexService } from './orama-index.service'
import { AladdinFallbackService } from './aladdin-fallback.service'
import { SearchQueryDto } from './dto/search-query.dto'
import { SearchResultDto } from './dto/search-result.dto'
import { isProfane } from '../../common/profanity/ko-profanity'
import { JeongbonaruService } from '../jeongbonaru/jeongbonaru.service'
import { resolveSearchInput } from '@nearbook/shared-types'

const POPULAR_QUERIES_FALLBACK = [
  '한강', '김호연', '베르나르 베르베르', '무라카미 하루키',
  '백희나', '나미야 잡화점', '아몬드', '불편한 편의점',
]

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name)
  private cache = new LRUCache<string, { data: SearchResultDto; revision: number }>({ max: 500, ttl: 60_000 })
  private trendingCache: { items: string[]; at: number } | null = null
  private enrichmentState = new LRUCache<string, { failed: boolean }>({ max: 500, ttl: 3600_000 })
  private enrichmentInFlight = new Map<string, Promise<void>>()

  constructor(
    private readonly orama: OramaIndexService,
    private readonly aladdin: AladdinFallbackService,
    private readonly jeongbonaru: JeongbonaruService,
  ) {}

  async getTrending(limit: number): Promise<string[]> {
    const now = Date.now()
    if (this.trendingCache && now - this.trendingCache.at < 5 * 60 * 1000) {
      return this.trendingCache.items.slice(0, limit)
    }

    try {
      const rows = await db.execute<{ query: string; count: number }>(sql`
        SELECT query, COUNT(*)::int as count
        FROM ${searchLogs}
        WHERE created_at > now() - interval '7 days'
        GROUP BY query
        HAVING COUNT(*) >= 5
        ORDER BY count DESC
        LIMIT 50
      `)

      const cleaned = rows
        .map(r => r.query.trim())
        .filter(q => q.length >= 1 && q.length <= 32)
        .filter(q => !isProfane(q))

      const merged: string[] = []
      const seen = new Set<string>()
      for (const q of [...cleaned, ...POPULAR_QUERIES_FALLBACK]) {
        if (seen.has(q)) continue
        seen.add(q)
        merged.push(q)
        if (merged.length >= 20) break
      }

      this.trendingCache = { items: merged, at: now }
      return merged.slice(0, limit)
    } catch (err) {
      this.logger.error('[Trending] Failed', err)
      return POPULAR_QUERIES_FALLBACK.slice(0, limit)
    }
  }

  async search(query: SearchQueryDto): Promise<SearchResultDto> {
    const start = Date.now()
    const input = resolveSearchInput(query.q, query.searchType)
    if (!input.q || input.q.length > 200 || input.invalidIsbn) throw new BadRequestException('Enter a valid search query or ISBN')
    query = { ...query, q: input.q, searchType: input.searchType }

    const page = typeof query.page === 'number' && !isNaN(query.page) ? query.page : 1
    const pageSize = typeof query.pageSize === 'number' && !isNaN(query.pageSize) ? query.pageSize : 10

    const cacheKey = JSON.stringify({ q: query.q, sort: query.sort, category: query.category, searchType: query.searchType, page, pageSize })
    this.cache.purgeStale()
    this.enrichmentState.purgeStale()
    const cached = this.cache.get(cacheKey)
    if (cached && cached.revision === this.orama.revision) return cached.data

    try {
      this.logger.log(`[Search] Query: "${query.q}" (Page: ${page})`)

      const revision = this.orama.revision
      const r = await this.orama.query({
        q: query.q,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        category: query.category,
        sort: query.sort,
        searchType: query.searchType,
      })

      // Provider pages (60/40 rows) do not correspond to local ten-row pages.
      // Fill one bounded first provider page per query/type; never advertise
      // unindexed remote totals or trigger downloads from arbitrary page URLs.
      const enrichmentKey = JSON.stringify([query.searchType, query.q])
      const eligible = query.searchType === 'isbn' ? r.total === 0 : query.q.length >= 2
      if (eligible) this.enrich(enrichmentKey, query)
      const state = this.enrichmentState.get(enrichmentKey)
      const enrichmentPending = r.total === 0 && eligible &&
        (this.enrichmentInFlight.has(enrichmentKey) || !state)
      const items = r.hits as unknown as SearchResultDto['items']

      const result: SearchResultDto = {
        items,
        total: r.total,
        page,
        pageSize,
        source: 'orama',
        durationMs: Date.now() - start,
        personalized: false,
        personalizeReason: 'disabled',
        enrichmentPending,
        enrichmentFailed: r.total === 0 && !enrichmentPending && state?.failed === true,
      }

      if (!enrichmentPending && !result.enrichmentFailed) this.logSearch(query, r.total).catch(() => {})

      if (items.length === 0) {
        // Optional discovery must not introduce a database wait into search.
        result.suggestions = []
        result.trending = POPULAR_QUERIES_FALLBACK.slice(0, 5)
      }

      if (!enrichmentPending && !result.enrichmentFailed && !this.enrichmentInFlight.has(enrichmentKey) && revision === this.orama.revision) {
        this.cache.set(cacheKey, { data: result, revision })
      }
      return result
    } catch (err: any) {
      this.logger.error(
        `search failed for q="${query.q}"`,
        err instanceof Error ? err.stack : String(err),
      )
      // A failed search is not a successful zero-result search. The web client
      // must retain its error/retry path rather than falsely claiming absence.
      throw new ServiceUnavailableException('Search is temporarily unavailable')
    }
  }

  private enrich(key: string, query: SearchQueryDto): void {
    if (this.enrichmentInFlight.has(key) || this.enrichmentState.has(key) || this.enrichmentInFlight.size >= 16) return
    // Reserve the slot before invoking providers so simultaneous requests coalesce.
    const task = Promise.resolve().then(async () => {
      let failed = false
      const naru = async () => {
        try {
          if (query.searchType === 'isbn') {
            const book = await this.jeongbonaru.getBookByIsbn(query.q)
            if (book && book.isbn !== query.q) throw new Error('Invalid ISBN metadata')
            if (book?.isbn === query.q) await this.orama.upsertMany([book])
          } else {
            const result = await this.jeongbonaru.searchAndCacheBooks(query.q, 1, 60, query.searchType)
            if (result.items.length) await this.orama.upsertMany(result.items)
          }
        } catch { failed = true }
      }
      const aladdin = async () => {
        if (query.searchType === 'isbn') return
        try {
          const books = await this.aladdin.searchAndCache(query.q, query.searchType)
          if (books.length) await this.orama.upsertMany(books)
        } catch { /* Secondary enrichment failure must not discard local results. */ }
      }
      await Promise.all([naru(), aladdin()])
      this.enrichmentState.set(key, { failed }, { ttl: failed ? 30_000 : 3600_000 })
    }).catch(() => {
      this.enrichmentState.set(key, { failed: true }, { ttl: 30_000 })
    }).finally(() => {
      this.enrichmentInFlight.delete(key)
      this.cache.clear()
    })
    this.enrichmentInFlight.set(key, task)
  }

  async suggest(q: string) {
    if (q.length < 2) return []
    const input = resolveSearchInput(q)
    const r = await this.orama.query({ q: input.q, searchType: input.searchType, limit: 8, offset: 0 })
    return r.hits
  }

  private async logSearch(query: SearchQueryDto, resultCount: number) {
    await db.insert(searchLogs).values({ query: query.q, resultCount, region: null }).catch(() => {})
  }

}
