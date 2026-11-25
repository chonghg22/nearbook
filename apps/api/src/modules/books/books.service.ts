import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { JeongbonaruService } from '../jeongbonaru/jeongbonaru.service'
import { LibrariesService } from '../libraries/libraries.service'
import { AffiliatesService } from '../affiliates/affiliates.service'
import { CacheService } from '../../common/cache.service'
import { BooksRepository } from './books.repository'
import { HomeCurationsService } from '../home-curations/home-curations.service'
import { BookAcquisitionLimiter } from '../jeongbonaru/book-acquisition-limiter.service'

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name)

  constructor(
    private readonly jeongbonaru: JeongbonaruService,
    private readonly libraries: LibrariesService,
    private readonly affiliates: AffiliatesService,
    private readonly cache: CacheService,
    private readonly repo: BooksRepository,
    private readonly homeCurations: HomeCurationsService,
    private readonly acquisitionLimiter: BookAcquisitionLimiter,
  ) {}

  async getByIsbn(isbn: string) {
    // L2 메모리
    const memKey = `book:meta:${isbn}`
    const mem = this.cache.get<any>(memKey)
    if (mem) return mem

    // L4 DB
    const dbRow = await this.repo.findByIsbn(isbn)
    if (dbRow) {
      this.cache.set(memKey, dbRow)
      return dbRow
    }

    // 정보나루
    const fresh = await this.jeongbonaru.getBookByIsbn(isbn)
    if (!fresh) throw new NotFoundException(`Book ${isbn} not found`)
    this.cache.set(memKey, fresh)
    return fresh
  }

  async getPopular(region = '전국', limit = 10) {
    const cacheKey = `popular:${region}:${limit}`
    const hit = this.cache.get<unknown[]>(cacheKey)
    if (hit) return hit
    const rows = await this.repo.getPopular(region, limit)
    this.cache.set(cacheKey, rows, 60 * 60 * 1000) // 1시간
    return rows
  }

  async acquire(isbn: string, subject: string) {
    await this.acquisitionLimiter.check(subject)
    const book = await this.jeongbonaru.getBookByIsbn(isbn, 'HIGH', true)
    if (!book) throw new NotFoundException('도서 정보 제공처에서 이 책을 찾지 못했습니다.')
    this.cache.set(`book:meta:${isbn}`, book)
    return book
  }

  async getRecent(limit = 10) {
    const cacheKey = `recent:${limit}`
    const hit = this.cache.get<unknown[]>(cacheKey)
    if (hit) return hit
    const rows = await this.repo.getRecent(limit)
    this.cache.set(cacheKey, rows, 60 * 60 * 1000) // 1시간
    return rows
  }

  async getLoanItemBooks(limit = 10) {
    const cacheKey = `loan-item:${limit}`
    const hit = this.cache.get<unknown[]>(cacheKey)
    if (hit) return hit
    const rows = await this.homeCurations.getLoanItemBooks(limit)
    if (rows.length > 0) this.cache.set(cacheKey, rows, 60 * 60 * 1000)
    return rows
  }

  async getHotTrendBooks(limit = 10, searchDt?: string) {
    const cacheKey = `hot-trend:${searchDt ?? 'current'}:${limit}`
    const hit = this.cache.get<unknown[]>(cacheKey)
    if (hit) return hit
    const rows = await this.homeCurations.getHotTrendBooks(limit, searchDt)
    if (rows.length > 0) this.cache.set(cacheKey, rows, 60 * 60 * 1000)
    return rows
  }

  async getCategories(limit = 30) {
    const cacheKey = `categories:${limit}`
    const hit = this.cache.get<unknown[]>(cacheKey)
    if (hit) return hit
    const rows = await this.homeCurations.getCategories()
    if (rows.some((row) => row.count > 0)) this.cache.set(cacheKey, rows, 6 * 60 * 60 * 1000)
    return rows
  }

  async getByCategory(categoryCode: string, limit = 40) {
    const cacheKey = `category:${categoryCode}:${limit}`
    const hit = this.cache.get<unknown[]>(cacheKey)
    if (hit) return hit
    const rows = await this.homeCurations.getCategoryBooks(categoryCode, limit)
    if (rows.length > 0) this.cache.set(cacheKey, rows, 6 * 60 * 60 * 1000)
    return rows
  }

  async getUsageAnalysis(isbn: string) {
    await this.getByIsbn(isbn) // Unknown ISBN enumeration cannot dispatch analysis either.
    try {
      const analysis = await this.jeongbonaru.getBookUsageAnalysis(isbn)
      await this.enrichAnalysisCoverUrls(analysis)
      return analysis
    } catch (err) {
      this.logger.warn(`getUsageAnalysis failed: ${isbn} (${String(err)})`)
      return {
        availability: 'unavailable',
        book: null,
        loanHistory: [],
        loanGroups: [],
        keywords: [],
        coLoanBooks: [],
        maniaRecBooks: [],
        readerRecBooks: [],
      }
    }
  }

  private async enrichAnalysisCoverUrls(analysis: any) {
    const bookLists = [analysis.coLoanBooks, analysis.maniaRecBooks, analysis.readerRecBooks]
    const isbns = bookLists.flatMap((list: any[]) =>
      (list ?? []).filter((b: any) => b.isbn && !b.coverUrl).map((b: any) => b.isbn),
    )
    if (isbns.length === 0) return

    const coverMap = await this.repo.findCoversByIsbns([...new Set(isbns)])
    for (const list of bookLists) {
      for (const book of list ?? []) {
        if (!book.coverUrl && coverMap.has(book.isbn)) {
          book.coverUrl = coverMap.get(book.isbn)
        }
      }
    }
  }

  async getWithLibraries(isbn: string, lat: number, lng: number, radiusKm = 5) {
    const book = await this.getByIsbn(isbn)
    const [libsWithAvail, affiliateLinks] = await Promise.all([
      this.libraries.getNearbyHoldings(lat, lng, isbn, radiusKm),
      this.affiliates.getAffiliateOptions(isbn),
    ])

    return {
      book,
      ...libsWithAvail,
      affiliates: affiliateLinks,
      cachedAt: new Date().toISOString(),
    }
  }

  getHoldings(isbn: string, lat: number, lng: number, radiusKm = 5) {
    return this.libraries.getNearbyHoldings(lat, lng, isbn, radiusKm)
  }
}
