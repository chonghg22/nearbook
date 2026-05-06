import { Injectable, Logger } from '@nestjs/common'
import { db, bookCache, searchLogs, sql, or, ilike, and, eq } from '@nearbook/db'
import { JeongbonaruService } from '../jeongbonaru/jeongbonaru.service'
import { LibrariesService } from '../libraries/libraries.service'
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
    private jeongbonaru: JeongbonaruService,
    private libraries: LibrariesService,
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
    
    // NaN 방어 코드
    const lat = typeof query.lat === 'number' && !isNaN(query.lat) ? query.lat : undefined
    const lng = typeof query.lng === 'number' && !isNaN(query.lng) ? query.lng : undefined
    const page = typeof query.page === 'number' && !isNaN(query.page) ? query.page : 1
    const pageSize = typeof query.pageSize === 'number' && !isNaN(query.pageSize) ? query.pageSize : 20

    const cacheKey = JSON.stringify({ ...query, lat, lng, page, pageSize })
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.data

    try {
      this.logger.log(`[Search] Query: "${query.q}" (lat=${lat}, lng=${lng})`)

      // 1. Local Search
      const localResults = await this.searchLocal(query) as any[]
      
      // 2. Remote Search
      let merged: any[] = localResults
      let source: 'cache' | 'jeongbonaru' | 'mixed' = 'cache'

      if (localResults.length < 10) {
        try {
          const remote = await this.jeongbonaru.searchBooks(query.q)
          // 필드명 정규화 (표준 규격으로 변환)
          const remoteResults = ((remote.items || []) as any[]).map(item => ({
            ...item,
            isbn: item.isbn13 || item.isbn,
            title: item.bookname || item.title,
            author: item.authors || item.author,
            publisher: item.publisher,
            coverUrl: item.bookImageURL || item.coverUrl
          }))

          if (remoteResults.length > 0) {
            merged = this.mergeResults(localResults, remoteResults)
            source = remote.source === 'cache_fallback' ? 'cache' : (localResults.length > 0 ? 'mixed' : 'jeongbonaru')
            // Async caching
            this.cacheRemoteResults(remoteResults).catch(e => this.logger.warn(`[Cache] Fail: ${e.message}`))
          }
        } catch (err: any) {
          this.logger.error(`[Remote] Fail: ${err.message}`)
        }
      }

      // 3. Library Enrichment
      let finalResults: any[] = merged

      if (query.availableOnly && lat && lng) {
        finalResults = await this.enrichWithLibraries(merged, lat, lng)
        finalResults = finalResults.filter((b: any) => (b.loanAvailable || 0) > 0)
      }

      const total = finalResults.length
      const itemsToDisplay = finalResults.slice((page - 1) * pageSize, page * pageSize)

      let items: any[] = itemsToDisplay
      if (!query.availableOnly && lat && lng && itemsToDisplay.length > 0) {
        items = await this.enrichWithLibraries(itemsToDisplay, lat, lng)
      } else if (!lat || !lng) {
        items = itemsToDisplay.map((b: any) => ({ ...b, libraryHoldings: 0, loanAvailable: 0 }))
      }

      await this.logSearch(query, total).catch(() => {})

      const result: SearchResultDto = {
        items: items as any,
        total,
        page,
        pageSize,
        source,
        durationMs: Date.now() - start,
      }

      if (total === 0) {
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
      const localResults = await this.searchLocal(query).catch(() => [])
      return {
        items: localResults.slice(0, pageSize) as any,
        total: localResults.length,
        page: page,
        pageSize: pageSize,
        source: 'cache' as const,
        durationMs: Date.now() - start,
      }
    }
  }

  private async cacheRemoteResults(books: any[]) {
    for (const book of books) {
      try {
        await this.cacheBook(book)
      } catch { /* ignore */ }
    }
  }

  async suggest(q: string) {
    return db.execute(sql`
      SELECT DISTINCT bc.isbn, bc.title, bc.author, pb.rank
      FROM nearbook.book_cache bc
      LEFT JOIN nearbook.popular_books pb
        ON bc.isbn = pb.isbn AND pb.region = '전국'
      WHERE bc.title ILIKE ${`${q}%`} OR bc.author ILIKE ${`${q}%`}
      ORDER BY pb.rank ASC NULLS LAST, bc.title
      LIMIT 8
    `) as unknown as any[]
  }

  private async searchLocal(query: SearchQueryDto) {
    const q = query.q || ''
    const pattern = `%${q}%`
    const prefix = `${q}%`
    const category = query.category || null

    this.logger.debug(`[searchLocal] q="${q}", category=${category}`)

    try {
      return await db.execute(sql`
        SELECT
          isbn,
          title,
          author,
          publisher,
          cover_url AS "coverUrl",
          GREATEST(
            similarity(title, ${q}),
            similarity(coalesce(author, ''), ${q})
          ) AS score
        FROM nearbook.book_cache
        WHERE
          (
            title ILIKE ${pattern}
            OR coalesce(author, '') ILIKE ${pattern}
            OR similarity(title, ${q}) > 0.1
          )
          AND (${category} IS NULL OR category = ${category})
        ORDER BY
          CASE WHEN title ILIKE ${prefix} THEN 1 ELSE 2 END,
          score DESC NULLS LAST,
          title ASC
        LIMIT 100
      `)
    } catch (err: any) {
      this.logger.error(`[searchLocal] Query failed: ${err.message}`)
      return []
    }
  }
  private async cacheBook(book: any) {
    if (!book.isbn) return
    await db.insert(bookCache).values({
      isbn: book.isbn,
      title: book.title || 'Unknown',
      author: book.author || 'Unknown',
      publisher: book.publisher ?? null,
      coverUrl: book.coverUrl ?? null,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }).onConflictDoUpdate({
      target: bookCache.isbn,
      set: {
        title: book.title || 'Unknown',
        author: book.author || 'Unknown',
        publisher: book.publisher ?? null,
        coverUrl: book.coverUrl ?? null,
        cachedAt: new Date(),
      }
    })
  }

  private mergeResults(local: any[], remote: any[]): any[] {
    const map = new Map()
    local.forEach(b => map.set(b.isbn, b))
    remote.forEach(b => { if (b.isbn && !map.has(b.isbn)) map.set(b.isbn, b) })
    return Array.from(map.values())
  }

  private async enrichWithLibraries(books: any[], lat: number, lng: number) {
    return Promise.all(
      books.map(async (book) => {
        let libs: Array<{ holdingCount?: number; loanAvailable?: number }> = []
        try {
          libs = await this.libraries.findNearWithBook(lat, lng, book.isbn, 5)
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
