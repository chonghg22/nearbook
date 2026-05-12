import { Injectable, Logger } from '@nestjs/common'
import { db, bookCache, searchLogs, sql, ilike } from '@nearbook/db'
import { LibrariesService } from '../libraries/libraries.service'
import { OramaIndexService } from './orama-index.service'
import { AladdinFallbackService } from './aladdin-fallback.service'
import { SearchPersonalizeService, AuthenticatedUser } from './search-personalize.service'
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
    private readonly personalize: SearchPersonalizeService,
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

  async search(query: SearchQueryDto, user: AuthenticatedUser | null = null): Promise<SearchResultDto> {
    const start = Date.now()

    const lat = typeof query.lat === 'number' && !isNaN(query.lat) ? query.lat : undefined
    const lng = typeof query.lng === 'number' && !isNaN(query.lng) ? query.lng : undefined
    const page = typeof query.page === 'number' && !isNaN(query.page) ? query.page : 1
    const pageSize = typeof query.pageSize === 'number' && !isNaN(query.pageSize) ? query.pageSize : 20

    const cacheKey = JSON.stringify({ ...query, lat, lng, page, pageSize, userId: user?.supabaseUserId ?? null })
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.data

    try {
      this.logger.log(`[Search] Query: "${query.q}" (lat=${lat}, lng=${lng})`)

      // 1차: Orama (로컬 인덱스, 즉시 응답)
      const r = await this.orama.query({
        q: query.q,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        category: query.category,
        sort: query.sort,
      })
      let hits = r.hits as any[]
      let source: SearchResultDto['source'] = 'orama'

      const shouldFetchAladdin = page === 1 && query.q.length >= 2
      if (shouldFetchAladdin) {
        if (hits.length < pageSize) {
          // 결과 부족 → 알라딘 await하여 병합
          const aladdinHits = await this.aladdin.searchAndCache(query.q).catch(() => [] as any[])
          if (aladdinHits.length > 0) {
            this.orama.upsertMany(aladdinHits).catch(() => {})
            hits = mergeUnique(hits, aladdinHits, 'isbn').slice(0, pageSize)
            source = 'orama+aladdin'
          }
        } else {
          // 결과 충분 → 알라딘은 백그라운드로 캐시만 채움 (응답 블로킹 없음)
          this.aladdin.searchAndCache(query.q)
            .then((h) => { if (h.length > 0) return this.orama.upsertMany(h) })
            .catch(() => {})
        }
      }

      // Personalize context 로딩
      const personalizeCtx = await this.personalize.loadContext(user, query.sort, query.personalize)

      // 3. Library Enrichment
      let finalResults: any[] = hits

      if (query.availableOnly && lat && lng) {
        finalResults = await this.enrichWithLibraries(hits, lat, lng)
        finalResults = finalResults.filter((b: any) => (b.loanAvailable || 0) > 0)
      } else if (personalizeCtx.applied) {
        // personalize: 즐겨찾기 도서관만 경량 조회 (전체 enrich 대신)
        finalResults = await this.checkFavoriteHoldings(hits, personalizeCtx.myLibraryIds)
      } else {
        finalResults = hits.map((b: any) => ({ ...b, libraryHoldings: 0, loanAvailable: 0, matchedLibraryIds: [] }))
      }

      // Personalize 재정렬
      const { items: rankedItems, context: finalContext } = this.personalize.rerank(finalResults, personalizeCtx)

      const total = query.availableOnly ? rankedItems.length : r.total

      // zero result 로그
      if (rankedItems.length === 0) {
        await db.insert(searchLogs).values({ query: query.q, resultCount: 0, region: null }).catch(() => {})
      } else {
        await this.logSearch(query, total).catch(() => {})
      }

      const result: SearchResultDto = {
        items: rankedItems as any,
        total,
        page,
        pageSize,
        source,
        durationMs: Date.now() - start,
        personalized: finalContext.applied,
        personalizeReason: finalContext.reason,
      }

      if (rankedItems.length === 0) {
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
        personalized: false,
        personalizeReason: 'disabled',
      }
    }
  }

  async suggest(q: string) {
    if (q.length < 2) return []
    const r = await this.orama.query({ q, limit: 8, offset: 0 })
    return r.hits
  }

  /**
   * personalize용 경량 소장 확인: 즐겨찾기 도서관 ID만 대상으로 조회.
   * enrichWithLibraries(주변 30개 도서관 전체 조회)와 달리 API 호출이 최소화됨.
   */
  private async checkFavoriteHoldings(books: any[], libraryIds: number[]) {
    if (libraryIds.length === 0) {
      return books.map((b: any) => ({ ...b, libraryHoldings: 0, loanAvailable: 0, matchedLibraryIds: [] }))
    }

    return Promise.all(
      books.map(async (book) => {
        const matched: number[] = []
        try {
          const checks = await Promise.allSettled(
            libraryIds.map(async (libId) => {
              const res = await this.libraries.checkOwnership(book.isbn, libId)
              return { libId, hasBook: res }
            }),
          )
          for (const c of checks) {
            if (c.status === 'fulfilled' && c.value.hasBook) {
              matched.push(c.value.libId)
            }
          }
        } catch (err) {
          this.logger.warn(`favorite holding check failed isbn=${book.isbn}: ${(err as Error).message}`)
        }
        return {
          ...book,
          libraryHoldings: matched.length,
          loanAvailable: 0,
          matchedLibraryIds: matched,
        }
      }),
    )
  }

  private async enrichWithLibraries(books: any[], lat: number, lng: number) {
    // findNear를 한 번만 호출하고 결과를 재사용
    const nearLibs = await this.libraries.findNear(lat, lng, 5, 30)
    if (nearLibs.length === 0) {
      return books.map((b: any) => ({ ...b, libraryHoldings: 0, loanAvailable: 0, matchedLibraryIds: [] }))
    }

    return Promise.all(
      books.map(async (book) => {
        let libs: Array<{ id?: number; holdingCount?: number; loanAvailable?: number }> = []
        try {
          libs = await this.libraries.findNearWithBookUsingLibs(nearLibs, book.isbn)
        } catch (err) {
          this.logger.warn(`enrich failed isbn=${book.isbn}: ${(err as Error).message}`)
        }
        return {
          ...book,
          libraryHoldings: libs.reduce((s, l) => s + (l.holdingCount ?? 0), 0),
          loanAvailable: libs.reduce((s, l) => s + (l.loanAvailable ?? 0), 0),
          matchedLibraryIds: libs
            .filter((l) => (l.holdingCount ?? 0) > 0)
            .map((l) => l.id)
            .filter(Boolean),
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
