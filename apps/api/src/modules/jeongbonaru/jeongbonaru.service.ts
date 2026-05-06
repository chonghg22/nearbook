import { Injectable, Logger } from '@nestjs/common'
import { db, bookCache, eq, sql } from '@nearbook/db'
import { CacheService } from '../../common/cache/cache.service'
import { JeongbonaruClient } from './jeongbonaru.client'
import {
  BookCacheRow,
  JeongbonaruBookDoc,
  JeongbonaruDocsResponse,
  JeongbonaruLibsResponse,
} from './jeongbonaru.types'

@Injectable()
export class JeongbonaruService {
  private readonly logger = new Logger(JeongbonaruService.name)

  constructor(
    private readonly client: JeongbonaruClient,
    private readonly cache: CacheService,
  ) {}

  /**
   * ISBN으로 책 조회. 캐시 우선 (Layer 4 = book_cache).
   * 만료된 캐시도 API 실패 시 fallback으로 반환 (graceful degradation).
   */
  async getBookByIsbn(isbn: string): Promise<BookCacheRow | null> {
    // 1. DB 캐시 우선
    const cached = await db.query.bookCache.findFirst({
      where: eq(bookCache.isbn, isbn),
    })
    if (cached && cached.expiresAt > new Date()) {
      return cached as BookCacheRow
    }

    // 2. API 호출
    try {
      const response = await this.client.get<JeongbonaruDocsResponse>(
        '/srchBooks',
        {
          keyword: isbn,
          pageNo: 1,
          pageSize: 1,
        },
      )

      const item = response.response?.docs?.[0]?.doc
      if (!item) {
        this.logger.warn(`정보나루에 책 없음: ${isbn}`)
        return cached ? (cached as BookCacheRow) : null
      }

      const book = this.mapBookDoc(item, isbn)

      await db
        .insert(bookCache)
        .values({
          ...book,
          cachedAt: new Date(),
          expiresAt: sql`now() + interval '30 days'`,
        })
        .onConflictDoUpdate({
          target: bookCache.isbn,
          set: {
            title: book.title,
            author: book.author,
            publisher: book.publisher,
            publishedYear: book.publishedYear,
            coverUrl: book.coverUrl,
            summary: book.summary,
            category: book.category,
            cachedAt: new Date(),
            expiresAt: sql`now() + interval '30 days'`,
          },
        })

      return book
    } catch (err) {
      // graceful: 만료된 캐시라도 반환
      this.logger.warn(
        `정보나루 호출 실패 → stale cache fallback: ${isbn} (${String(err)})`,
      )
      return cached ? (cached as BookCacheRow) : null
    }
  }

  /** 키워드 검색 (캐시 안 함) */
  async searchBooks(keyword: string, page = 1): Promise<any> {
    const response = await this.client.get<JeongbonaruDocsResponse>(
      '/srchBooks',
      { keyword, pageNo: page, pageSize: 20 },
    )
    const items = (response.response?.docs ?? []).map((d) => d.doc)
    return { items }
  }

  /** 도서관 보유 정보 (5분 캐시) */
  async getBookOwnership(isbn: string, libCode: string | number): Promise<any> {
    const cacheKey = `loan:${isbn}:${libCode}`
    const cached = this.cache.get<any>(cacheKey)
    if (cached) return cached

    const result = await this.client.get<any>('/bookExist', {
      isbn13: isbn,
      libCode,
    })
    this.cache.set(cacheKey, result, 5 * 60 * 1000)
    return result
  }

  /** Alias methods for Cron/Compatibility */
  async getBookByIsbnAsCron(isbn: string) {
    return this.getBookByIsbn(isbn)
  }

  async searchBooksAsCron(keyword: string, page: number) {
    const docs = await this.searchBooks(keyword, page)
    return { docs }
  }

  async getBookOwnershipAsCron(isbn: string, libCode: string | number) {
    return this.getBookOwnership(isbn, libCode)
  }

  /** 도서관 목록 (시드용 — Step 04 다음 단계에서 사용) */
  async listLibraries(pageNo = 1, pageSize = 100) {
    const response = await this.client.get<JeongbonaruLibsResponse>(
      '/libSrch',
      { pageNo, pageSize },
    )
    return (response.response?.libs ?? []).map((l) => l.lib)
  }

  /** 인기 대출도서 */
  async getPopularBooks(libCode?: string) {
    const today = new Date().toISOString().slice(0, 10)
    const past = new Date(Date.now() - 7 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10)

    const response = await this.client.get<JeongbonaruDocsResponse>(
      '/loanItemSrch',
      {
        ...(libCode ? { libCode } : {}),
        from: past,
        to: today,
        pageNo: 1,
        pageSize: 100,
      },
    )
    return (response.response?.docs ?? []).map((d) => d.doc)
  }

  private mapBookDoc(item: JeongbonaruBookDoc, fallbackIsbn: string): BookCacheRow {
    return {
      isbn: item.isbn13 ?? fallbackIsbn,
      title: item.bookname ?? '(제목 없음)',
      author: item.authors ?? null,
      publisher: item.publisher ?? null,
      publishedYear: item.publication_year
        ? Number.parseInt(item.publication_year, 10) || null
        : null,
      coverUrl: item.bookImageURL ?? null,
      summary: item.description ?? null,
      category: item.class_nm ?? null,
    }
  }
}
