import { Injectable, Logger } from '@nestjs/common'
import { db, bookCache, searchLogs, sql, ilike } from '@nearbook/db'
import { OramaIndexService } from './orama-index.service'
import { AladdinFallbackService } from './aladdin-fallback.service'
import { SearchQueryDto } from './dto/search-query.dto'
import { SearchResultDto } from './dto/search-result.dto'
import { isProfane } from '../../common/profanity/ko-profanity'
import { JeongbonaruService } from '../jeongbonaru/jeongbonaru.service'

const POPULAR_QUERIES_FALLBACK = [
  '한강', '김호연', '베르나르 베르베르', '무라카미 하루키',
  '백희나', '나미야 잡화점', '아몬드', '불편한 편의점',
]

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name)
  private cache = new Map<string, { data: SearchResultDto; expiresAt: number }>()
  private trendingCache: { items: string[]; at: number } | null = null
  private naruSyncCache = new Map<string, number>() // keyword -> timestamp

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

    const page = typeof query.page === 'number' && !isNaN(query.page) ? query.page : 1
    const pageSize = typeof query.pageSize === 'number' && !isNaN(query.pageSize) ? query.pageSize : 10

    const cacheKey = JSON.stringify({ q: query.q, sort: query.sort, category: query.category, searchType: query.searchType, page, pageSize })
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.data

    try {
      this.logger.log(`[Search] Query: "${query.q}" (Page: ${page})`)

      let r = await this.orama.query({
        q: query.q,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        category: query.category,
        sort: query.sort,
        searchType: query.searchType,
      })

      // [정보나루 지능형 동기 보충]
      const lastSyncKey = `${query.q}:${page}`
      const lastSync = this.naruSyncCache.get(lastSyncKey) || 0
      const isExpired = Date.now() - lastSync > 3600_000 // 1시간 경과

      // 1. 첫 검색(1페이지)인데 로컬 결과가 너무 적거나(예: 60건 미만) 아예 처음인 경우 -> 넓게 긁어옴 (60건)
      // 2. 2페이지 이상을 보는데 해당 페이지의 로컬 결과가 부족한 경우 -> 해당 구간 긁어옴
      const isFirstPageUnderpopulated = page === 1 && r.total < 60
      const isTargetPageEmpty = r.hits.length < pageSize && r.total < 1000 // 1000건 미만일 때만 시도 (성능)

      if (query.q.length >= 2 && isExpired && (isFirstPageUnderpopulated || isTargetPageEmpty)) {
        this.logger.log(`[Search] Naru Deep Sync for "${query.q}" P${page} (local total: ${r.total})`)
        this.naruSyncCache.set(lastSyncKey, Date.now())
        
        // 첫 페이지라면 60건(넓게), 아니면 해당 페이지 위주로 40건 보충
        const syncSize = page === 1 ? 60 : 40
        const naruItems = await this.jeongbonaru.searchAndCacheBooks(query.q, page, syncSize)
        
        if (naruItems.length > 0) {
          await this.orama.upsertMany(naruItems)
          // 데이터 보충 후 재검색
          r = await this.orama.query({
            q: query.q,
            limit: pageSize,
            offset: (page - 1) * pageSize,
            category: query.category,
            sort: query.sort,
            searchType: query.searchType,
          })
        }
      }

      const items = r.hits as any[]

      // 알라딘은 항상 백그라운드로 캐시만 채움 (응답 블로킹 없음)
      const shouldFetchAladdin = page === 1 && query.q.length >= 2
      if (shouldFetchAladdin) {
        this.aladdin.searchAndCache(query.q)
          .then((h) => { if (h.length > 0) return this.orama.upsertMany(h) })
          .catch(() => {})
      }

      // zero result 로그 (fire-and-forget)
      if (items.length === 0) {
        db.insert(searchLogs).values({ query: query.q, resultCount: 0, region: null }).catch(() => {})
      } else {
        this.logSearch(query, r.total).catch(() => {})
      }

      const result: SearchResultDto = {
        items,
        total: r.total,
        page,
        pageSize,
        source: 'orama',
        durationMs: Date.now() - start,
        personalized: false,
        personalizeReason: 'disabled',
      }

      if (items.length === 0) {
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
