import { Injectable, Logger } from '@nestjs/common'
import { JeongbonaruClient } from './jeongbonaru.client'
import { db, bookCache, sql, eq, or, ilike } from '@nearbook/db'
import { Priority } from '../quota/quota.service'
import { DedupeKey } from './dedupe-key.util'

@Injectable()
export class JeongbonaruService {
  private readonly logger = new Logger(JeongbonaruService.name)

  constructor(private client: JeongbonaruClient) {}

  // 사용자 직접 — HIGH
  async getBookByIsbn(isbn: string, priority: Priority = 'HIGH') {
    const cached = await db.query.bookCache.findFirst({
      where: eq(bookCache.isbn, isbn),
    })
    if (cached && cached.expiresAt > new Date()) return cached

    try {
      const response = await this.client.get<any>(
        '/srchBooks',
        { keyword: isbn, pageNo: 1, pageSize: 1 },
        {
          priority,
          enqueueOnBlock: {
            lookupType: 'isbn',
            dedupeKey: DedupeKey.isbn(isbn),
            payload: { isbn },
          },
        },
      )
      const item = response?.response?.docs?.[0]?.doc
      if (!item) return cached || null

      return await this.saveBookCache(item)
    } catch (err: any) {
      if (err.message === 'QUOTA_BLOCKED_ALL' || err.message === 'QUOTA_BLOCKED_LOW') {
        this.logger.warn(`Quota blocked, fallback to cache for isbn: ${isbn}`)
        return cached || null
      }
      this.logger.error(`API call failed for isbn: ${isbn}`, err.message)
      return cached || null
    }
  }

  // 사용자 직접 — HIGH
  async getBookOwnership(isbn: string, libCode: string | number, priority: Priority = 'HIGH') {
    try {
      return await this.client.get<any>(
        '/bookExist',
        { isbn13: isbn, libCode },
        {
          priority,
          enqueueOnBlock: {
            lookupType: 'lib_book',
            dedupeKey: DedupeKey.libBook(isbn, libCode),
            payload: { isbn, libCode },
          },
        },
      )
    } catch (err: any) {
      if (err.message === 'QUOTA_BLOCKED_ALL' || err.message === 'QUOTA_BLOCKED_LOW') {
        return { response: { error: 'QUOTA_BLOCKED', note: '정보나루 한도 초과로 확인 불가' } }
      }
      throw err
    }
  }

  // 사용자 직접 — HIGH
  async searchBooks(keyword: string, page = 1, priority: Priority = 'HIGH') {
    try {
      const response = await this.client.get<any>(
        '/srchBooks',
        { keyword, pageNo: page, pageSize: 20 },
        {
          priority,
          enqueueOnBlock: {
            lookupType: 'keyword',
            dedupeKey: DedupeKey.keyword(keyword),
            payload: { keyword, page, pageSize: 20 },
          },
        },
      )
      const items = response?.response?.docs?.map((d: any) => d.doc) || []
      
      // 검색 결과 비동기 캐싱 (background)
      if (items.length > 0) {
        void Promise.all(items.map((item: any) => this.saveBookCache(item)))
      }

      return {
        items,
        source: 'jeongbonaru' as const,
      }
    } catch (err: any) {
      if (err.message === 'QUOTA_BLOCKED_ALL' || err.message === 'QUOTA_BLOCKED_LOW') {
        // pg_trgm 폴백 (ILike 사용 - DB에 trgm 인덱스 필요)
        const fallback = await db
          .select()
          .from(bookCache)
          .where(
            or(
              ilike(bookCache.title, `%${keyword}%`),
              ilike(bookCache.author, `%${keyword}%`),
            ),
          )
          .limit(20)

        return {
          items: fallback,
          source: 'cache_fallback' as const,
          note: '정보나루 일일 한도 초과로 캐시 결과만 표시',
        }
      }
      throw err
    }
  }

  // Cron 전용 메서드
  async getBookByIsbnAsCron(isbn: string) {
    const response = await this.client.get<any>(
      '/srchBooks',
      { keyword: isbn, pageNo: 1, pageSize: 1 },
      { priority: 'LOW' },
    )
    const item = response?.response?.docs?.[0]?.doc
    if (item) await this.saveBookCache(item)
  }

  async searchBooksAsCron(keyword: string, page = 1) {
    const response = await this.client.get<any>(
      '/srchBooks',
      { keyword, pageNo: page, pageSize: 20 },
      { priority: 'LOW' },
    )
    const items = response?.response?.docs?.map((d: any) => d.doc) || []
    if (items.length > 0) {
      await Promise.all(items.map((item: any) => this.saveBookCache(item)))
    }
  }

  async getBookOwnershipAsCron(isbn: string, libCode: string | number) {
    await this.client.get<any>(
      '/bookExist',
      { isbn13: isbn, libCode },
      { priority: 'LOW' },
    )
    // bookExist는 캐시할 메타데이터가 없음 (소장여부만 반환)
  }

  private async saveBookCache(item: any) {
    const year = item.publication_year ? parseInt(item.publication_year) : null
    const book = {
      isbn: item.isbn13 || item.isbn,
      title: item.bookname,
      author: item.authors,
      publisher: item.publisher,
      publishedYear: isNaN(year as number) ? null : year,
      coverUrl: item.bookImageURL || null,
      summary: item.description || null,
      category: item.class_nm || null,
    }

    if (!book.isbn) return null

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
  }

  // 백그라운드 시드 — LOW
  async listLibraries(pageNo = 1, pageSize = 100, priority: Priority = 'LOW') {
    const response = await this.client.get<any>(
      '/libSrch',
      { pageNo, pageSize },
      { priority },
    )
    return response?.response?.libs || []
  }

  // 백그라운드 cron — LOW
  async getPopularBooks(libCode?: string, period = 'week', priority: Priority = 'LOW') {
    const today = new Date().toISOString().slice(0, 10)
    const past = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)

    const response = await this.client.get<any>(
      '/loanItemSrch',
      { libCode, from: past, to: today, pageNo: 1, pageSize: 100 },
      { priority },
    )
    return response?.response?.docs?.map((d: any) => d.doc) || []
  }
}
