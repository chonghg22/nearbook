import { Injectable, Logger } from '@nestjs/common'
import { db, bookCache, searchLogs, sql, ilike } from '@nearbook/db'
import { LibrariesService } from '../libraries/libraries.service'
import { OramaIndexService } from './orama-index.service'
import { AladdinFallbackService } from './aladdin-fallback.service'
import { SearchQueryDto } from './dto/search-query.dto'
import { SearchResultDto } from './dto/search-result.dto'
import { isProfane } from '../../common/profanity/ko-profanity'

const POPULAR_QUERIES_FALLBACK = [
  '한강', '김호연', '베르나르 베르베르', '무라카미 하루키',
  '백희나', '나미야 잡화점', '아몬드', '불편한 편의점',
]

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name)
  private cache = new Map<string, { data: SearchResultDto; expiresAt: number }>()
  private trendingCache: { items: string[]; at: number } | null = null

  constructor(
    private readonly orama: OramaIndexService,
    private readonly aladdin: AladdinFallbackService,
    private readonly libraries: LibrariesService,
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

    const lat = typeof query.lat === 'number' && !isNaN(query.lat) ? query.lat : undefined
    const lng = typeof query.lng === 'number' && !isNaN(query.lng) ? query.lng : undefined
    const page = typeof query.page === 'number' && !isNaN(query.page) ? query.page : 1
    const pageSize = typeof query.pageSize === 'number' && !isNaN(query.pageSize) ? query.pageSize : 20

    const cacheKey = JSON.stringify({ ...query, lat, lng, page, pageSize })
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.data

    try {
      this.logger.log(`[Search] Query: "${query.q}" (lat=${lat}, lng=${lng})`)

      // 1차: Orama
      const r = await this.orama.query({
        q: query.q,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        category: query.category,
        sort: query.sort,
      })
      let hits = r.hits as any[]
      let source: SearchResultDto['source'] = 'orama'

      // 2차: 결과 부족 → 알라딘 TTB fallback (page=1만)
      const threshold = Number(process.env.SEARCH_FALLBACK_THRESHOLD ?? 5)
      if (hits.length < threshold && page === 1 && query.q.length >= 2) {
        const aladdinHits = await this.aladdin.searchAndCache(query.q)
        if (aladdinHits.length > 0) {
          await this.orama.upsertMany(aladdinHits)
          hits = mergeUnique(hits, aladdinHits, 'isbn').slice(0, pageSize)
          source = 'orama+aladdin'
        }
      }

      // 3. Library Enrichment — 대출가능 필터일 때만 (외부 API 호출이 느림)
      let finalResults: any[] = hits

      if (query.availableOnly && lat && lng) {
        finalResults = await this.enrichWithLibraries(hits, lat, lng)
        finalResults = finalResults.filter((b: any) => (b.loanAvailable || 0) > 0)
      } else {
        finalResults = hits.map((b: any) => ({ ...b, libraryHoldings: 0, loanAvailable: 0 }))
      }

      const total = query.availableOnly ? finalResults.length : r.total

      // zero result 로그
      if (finalResults.length === 0) {
        await db.insert(searchLogs).values({ query: query.q, resultCount: 0, region: null }).catch(() => {})
      } else {
        await this.logSearch(query, total).catch(() => {})
      }

      const result: SearchResultDto = {
        items: finalResults as any,
        total,
        page,
        pageSize,
        source,
        durationMs: Date.now() - start,
      }

      if (finalResults.length === 0) {
        result.suggestions = await this.findSimilar(query.q).catch(() => [])
        result.trending = await this.getTrending(5).catch(() => [])
      }

      this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + 60_000 })
      return result
    } catch (err: any) {
      this.logger.error(
        `search failed for q="${query.q}"`,
        err instanceof Error ? err.stack : String(err),
      )
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        source: 'orama',
        durationMs: Date.now() - start,
      }
    }
  }

  async suggest(q: string) {
    if (q.length < 2) return []
    const r = await this.orama.query({ q, limit: 8, offset: 0 })
    return r.hits
  }

  private async enrichWithLibraries(books: any[], lat: number, lng: number) {
    // findNear를 한 번만 호출하고 결과를 재사용
    const nearLibs = await this.libraries.findNear(lat, lng, 5, 30)
    if (nearLibs.length === 0) {
      return books.map((b: any) => ({ ...b, libraryHoldings: 0, loanAvailable: 0 }))
    }

    return Promise.all(
      books.map(async (book) => {
        let libs: Array<{ holdingCount?: number; loanAvailable?: number }> = []
        try {
          libs = await this.libraries.findNearWithBookUsingLibs(nearLibs, book.isbn)
        } catch (err) {
          this.logger.warn(`enrich failed isbn=${book.isbn}: ${(err as Error).message}`)
        }
        return {
          ...book,
          libraryHoldings: libs.reduce((s, l) => s + (l.holdingCount ?? 0), 0),
          loanAvailable: libs.reduce((s, l) => s + (l.loanAvailable ?? 0), 0),
        }
      }),
    )
  }

  private async logSearch(query: SearchQueryDto, resultCount: number) {
    await db.insert(searchLogs).values({ query: query.q, resultCount, region: null }).catch(() => {})
  }

  private async findSimilar(q: string): Promise<string[]> {
    try {
      const rows = await db
        .select({ title: bookCache.title })
        .from(bookCache)
        .where(ilike(bookCache.title, `%${q}%`))
        .limit(5)
      return rows.map(r => r.title)
    } catch {
      return []
    }
  }
}

function mergeUnique<T extends Record<string, any>>(a: T[], b: T[], key: string): T[] {
  const seen = new Set(a.map(x => x[key]))
  return [...a, ...b.filter(x => !seen.has(x[key]))]
}
