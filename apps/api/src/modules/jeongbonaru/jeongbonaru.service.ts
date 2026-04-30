import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import { bookCache, db, eq } from '@nearbook/db'
import { CacheService } from '../../common/cache.service'
import { BookExistDto } from './dto/book-exist.dto'
import { JeongbonaruClient } from './jeongbonaru.client'

@Injectable()
export class JeongbonaruService {
  private readonly logger = new Logger(JeongbonaruService.name)

  constructor(
    private readonly client: JeongbonaruClient,
    private readonly cache: CacheService,
  ) {}

  async getBookByIsbn(isbn: string): Promise<BookExistDto | null> {
    const memKey = `book:${isbn}`
    const memHit = this.cache.get<BookExistDto>(memKey)
    if (memHit) {
      this.logger.debug(`메모리 캐시 히트: ${isbn}`)
      return memHit
    }

    const dbHit = await db.query.bookCache.findFirst({
      where: eq(bookCache.isbn, isbn),
    })

    if (dbHit && dbHit.expiresAt > new Date()) {
      this.logger.debug(`DB 캐시 히트: ${isbn}`)
      const mapped = this.mapDbCache(dbHit)
      this.cache.set(memKey, mapped)
      return mapped
    }

    try {
      return await this.fetchAndCacheBook(isbn, memKey, dbHit ?? undefined)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error'
      if (dbHit) {
        this.logger.warn(`API 실패, 만료 캐시 사용: ${isbn} (${message})`)
        return this.mapDbCache(dbHit)
      }

      if (message === 'API_LIMIT_EXCEEDED') {
        this.logger.error(`API 한도 초과, 캐시도 없음: ${isbn}`)
        throw new HttpException('API_LIMIT_EXCEEDED', HttpStatus.TOO_MANY_REQUESTS)
      }

      this.logger.error(`API 실패, 캐시도 없음: ${isbn}`)
      return null
    }
  }

  private async fetchAndCacheBook(
    isbn: string,
    memKey: string,
    existingDbRow: typeof bookCache.$inferSelect | undefined,
  ): Promise<BookExistDto | null> {
    const response = await this.client.get<JeongbonaruSearchRaw>('/srchBooks', {
      isbn13: isbn,
      pageNo: 1,
      pageSize: 1,
    })

    const item = response.response?.docs?.[0]?.doc
    if (!item) {
      return existingDbRow ? this.mapDbCache(existingDbRow) : null
    }

    const book: BookExistDto = {
      isbn: item.isbn13 ?? isbn,
      hasBook: true,
      loanAvailable: Number(item.loan_count ?? 0) > 0,
      title: item.bookname ?? '',
      author: item.authors ?? '',
      publisher: item.publisher ?? '',
      publishedYear: item.publication_year ? parseInt(item.publication_year, 10) : null,
      coverUrl: item.bookImageURL ?? null,
      callNumber: null,
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await db
      .insert(bookCache)
      .values({
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        publisher: book.publisher,
        publishedYear: book.publishedYear,
        coverUrl: book.coverUrl,
        cachedAt: new Date(),
        expiresAt,
      })
      .onConflictDoUpdate({
        target: bookCache.isbn,
        set: {
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          publishedYear: book.publishedYear,
          coverUrl: book.coverUrl,
          cachedAt: new Date(),
          expiresAt,
        },
      })

    this.cache.set(memKey, book)
    return book
  }

  async searchBooks(params: { keyword: string; pageNo: number; pageSize: number }) {
    const res = await this.client.get<JeongbonaruSearchRaw>('/srchBooks', {
      keyword: params.keyword,
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    })
    const docs = res?.response?.docs ?? []
    return docs.map((d: any) => ({
      isbn: d.doc?.isbn13 ?? d.doc?.isbn,
      title: d.doc?.bookname,
      author: d.doc?.authors,
      publisher: d.doc?.publisher,
      publishedYear: d.doc?.publication_year ? parseInt(d.doc.publication_year, 10) : null,
      coverUrl: d.doc?.bookImageURL ?? null,
      loanCount: Number(d.doc?.loan_count ?? 0),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    }))
  }

  async checkBookExist(isbn: string, libCode: string): Promise<BookExistDto | null> {
    const cacheKey = `exist:${isbn}:${libCode}`
    const hit = this.cache.get<BookExistDto>(cacheKey)
    if (hit) {
      return hit
    }

    const raw = await this.client.get<JeongbonaruBookExistRaw>('/bookExist', {
      isbn13: isbn,
      libCode,
    })

    const result = raw.response?.result
    if (!result) {
      return null
    }

    const dto: BookExistDto = {
      isbn,
      hasBook: result.hasBook === 'Y',
      loanAvailable: result.loanAvailable === 'Y',
      title: result.title ?? '',
      author: result.author ?? '',
      publisher: result.publisher ?? '',
      publishedYear: result.publishedYear ? parseInt(result.publishedYear, 10) : null,
      coverUrl: result.bookImageURL ?? null,
      callNumber: result.callNumber ?? null,
    }

    this.cache.set(cacheKey, dto, 5 * 60 * 1000)
    return dto
  }

  async getPopularBooks(libCode: string) {
    const today = new Date().toISOString().slice(0, 10)
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const response = await this.client.get<JeongbonaruSearchRaw>('/loanItemSrch', {
      libCode,
      from: past,
      to: today,
      pageNo: 1,
      pageSize: 100,
    })

    return response.response?.docs?.map((doc) => doc.doc) ?? []
  }

  private mapDbCache(row: typeof bookCache.$inferSelect): BookExistDto {
    return {
      isbn: row.isbn,
      hasBook: true,
      loanAvailable: false,
      title: row.title,
      author: row.author ?? '',
      publisher: row.publisher ?? '',
      publishedYear: row.publishedYear ?? null,
      coverUrl: row.coverUrl ?? null,
      callNumber: null,
    }
  }
}

interface JeongbonaruBookDoc {
  isbn13?: string
  loan_count?: number | string
  bookname?: string
  authors?: string
  publisher?: string
  publication_year?: string
  bookImageURL?: string
}

interface JeongbonaruSearchRaw {
  response?: {
    docs?: Array<{
      doc: JeongbonaruBookDoc
    }>
  }
}

interface JeongbonaruBookExistRaw {
  response?: {
    result?: {
      hasBook?: string
      loanAvailable?: string
      title?: string
      author?: string
      publisher?: string
      publishedYear?: string
      bookImageURL?: string
      callNumber?: string
    }
  }
}
