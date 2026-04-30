import { Injectable, Logger } from '@nestjs/common'
import { db, bookCache, searchLogs, sql } from '@nearbook/db'
import { JeongbonaruService } from '../jeongbonaru/jeongbonaru.service'
import { LibrariesService } from '../libraries/libraries.service'
import { SearchQueryDto } from './dto/search-query.dto'
import { SearchResultDto } from './dto/search-result.dto'

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name)
  // 간단한 in-memory 검색 캐시 (1분 TTL)
  private cache = new Map<string, { data: SearchResultDto; expiresAt: number }>()

  constructor(
    private jeongbonaru: JeongbonaruService,
    private libraries: LibrariesService,
  ) {}

  async search(query: SearchQueryDto): Promise<SearchResultDto> {
    const start = Date.now()
    const cacheKey = JSON.stringify(query)
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.data

    // 1차: Postgres pg_trgm
    const localResults = await this.searchLocal(query)

    if (localResults.length >= 5) {
      const result: SearchResultDto = {
        items: localResults.slice(
          (query.page! - 1) * query.pageSize!,
          query.page! * query.pageSize!,
        ),
        total: localResults.length,
        page: query.page!,
        pageSize: query.pageSize!,
        source: 'cache',
        durationMs: Date.now() - start,
      }
      this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + 60_000 })
      await this.logSearch(query, result.total)
      return result
    }

    // 2차: 정보나루 fallback
    try {
      const remoteResults = await this.jeongbonaru.searchBooks({
        keyword: query.q,
        pageNo: query.page!,
        pageSize: query.pageSize!,
      })
      for (const book of remoteResults) await this.cacheBook(book)

      const merged = this.mergeResults(localResults, remoteResults)
      const enriched =
        query.lat && query.lng
          ? await this.enrichWithLibraries(merged, query.lat, query.lng)
          : merged.map(b => ({ ...b, libraryHoldings: 0, loanAvailable: 0 }))

      await this.logSearch(query, enriched.length)

      const result: SearchResultDto = {
        items: enriched.slice(
          (query.page! - 1) * query.pageSize!,
          query.page! * query.pageSize!,
        ),
        total: enriched.length,
        page: query.page!,
        pageSize: query.pageSize!,
        source: localResults.length > 0 ? 'mixed' : 'jeongbonaru',
        durationMs: Date.now() - start,
      }
      this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + 60_000 })
      return result
    } catch (err) {
      this.logger.error('search remote failed', err)
      if (localResults.length === 0) {
        const suggestions = await this.findSimilar(query.q)
        const trending = await this.getTrendingQueries()
        return {
          items: [],
          total: 0,
          page: query.page!,
          pageSize: query.pageSize!,
          source: 'cache',
          durationMs: Date.now() - start,
          suggestions,
          trending,
        }
      }
      return {
        items: localResults,
        total: localResults.length,
        page: query.page!,
        pageSize: query.pageSize!,
        source: 'cache',
        durationMs: Date.now() - start,
      }
    }
  }

  async suggest(q: string): Promise<any[]> {
    const rows = await db.execute<{
      isbn: string; title: string; author: string
    }>(sql`
      SELECT bc.isbn, bc.title, bc.author
      FROM book_cache bc
      LEFT JOIN popular_books pb ON bc.isbn = pb.isbn AND pb.region = '전국'
      WHERE bc.title ILIKE ${`${q}%`} OR bc.author ILIKE ${`${q}%`}
      GROUP BY bc.isbn, bc.title, bc.author, pb.rank
      ORDER BY pb.rank ASC NULLS LAST, bc.title
      LIMIT 8
    `)
    return rows
  }

  private async searchLocal(query: SearchQueryDto) {
    const categoryFilter = query.category
      ? sql`AND category = ${query.category}`
      : sql``

    const rows = await db.execute<any>(sql`
      SELECT isbn, title, author, publisher,
        cover_url AS "coverUrl",
        similarity(title, ${query.q}) AS score
      FROM book_cache
      WHERE (
        title ILIKE ${`%${query.q}%`}
        OR author ILIKE ${`%${query.q}%`}
        OR similarity(title, ${query.q}) > 0.3
      )
      ${categoryFilter}
      ORDER BY
        CASE WHEN title ILIKE ${`${query.q}%`} THEN 1 ELSE 2 END,
        similarity(title, ${query.q}) DESC,
        title
      LIMIT 100
    `)
    return rows
  }

  private async cacheBook(book: any) {
    await db.insert(bookCache).values({
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      publisher: book.publisher ?? null,
      coverUrl: book.coverUrl ?? null,
      cachedAt: new Date(),
      expiresAt: sql`now() + interval '30 days'`,
    }).onConflictDoNothing()
  }

  private mergeResults(local: any[], remote: any[]): any[] {
    const map = new Map(local.map(b => [b.isbn, b]))
    for (const b of remote) {
      if (!map.has(b.isbn)) map.set(b.isbn, b)
    }
    return Array.from(map.values())
  }

  private async enrichWithLibraries(books: any[], lat: number, lng: number) {
    return Promise.all(
      books.map(async (book) => {
        try {
          const libs = await this.libraries.findNearWithBook(lat, lng, book.isbn, 5)
          return {
            ...book,
            libraryHoldings: libs.reduce((s: number, l: any) => s + l.holdingCount, 0),
            loanAvailable: libs.reduce((s: number, l: any) => s + l.loanAvailable, 0),
          }
        } catch {
          return { ...book, libraryHoldings: 0, loanAvailable: 0 }
        }
      }),
    )
  }

  private async logSearch(query: SearchQueryDto, resultCount: number) {
    try {
      await db.insert(searchLogs).values({
        query: query.q,
        resultCount,
        region: null,
      })
    } catch (err) {
      this.logger.warn('search log failed', err)
    }
  }

  private async findSimilar(q: string): Promise<string[]> {
    const rows = await db.execute<{ title: string }>(sql`
      SELECT title FROM book_cache
      WHERE similarity(title, ${q}) > 0.15
      ORDER BY similarity(title, ${q}) DESC
      LIMIT 5
    `)
    return rows.map((r: { title: string }) => r.title)
  }

  private async getTrendingQueries(): Promise<string[]> {
    const rows = await db.execute<{ query: string }>(sql`
      SELECT query FROM search_logs
      WHERE created_at > now() - interval '7 days'
      GROUP BY query
      ORDER BY COUNT(*) DESC
      LIMIT 5
    `)
    return rows.map((r: { query: string }) => r.query)
  }
}
