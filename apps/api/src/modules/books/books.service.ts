import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { JeongbonaruService } from '../jeongbonaru/jeongbonaru.service'
import { LibrariesService } from '../libraries/libraries.service'
import { AffiliatesService } from '../affiliates/affiliates.service'
import { CacheService } from '../../common/cache.service'
import { BooksRepository } from './books.repository'
import { HomeCurationsService } from '../home-curations/home-curations.service'

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
  ) {}

  async getByIsbn(isbn: string) {
    // L2 메모리
    const memKey = `book:meta:${isbn}`
    const mem = this.cache.get<any>(memKey)
    if (mem) return mem

    // L4 DB
    const dbRow = await this.repo.findByIsbn(isbn)
    if (dbRow && dbRow.expiresAt > new Date()) {
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

  async getUsageAnalysis(isbn: string) {
    const cacheKey = `book:analysis:${isbn}`
    const hit = this.cache.get<unknown>(cacheKey)
    if (hit) return hit

    try {
      const analysis = await this.jeongbonaru.getBookUsageAnalysis(isbn)
      this.cache.set(cacheKey, analysis, 24 * 60 * 60 * 1000)
      return analysis
    } catch (err) {
      this.logger.warn(`getUsageAnalysis failed: ${isbn} (${String(err)})`)
      return {
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

  async getWithLibraries(isbn: string, lat: number, lng: number, radiusKm = 5) {
    const [book, libsWithAvail, affiliateLinks] = await Promise.all([
      this.getByIsbn(isbn),
      this.libraries.findNearWithBook(lat, lng, isbn, radiusKm),
      Promise.resolve(this.affiliates.buildLinks(isbn)),
    ])

    return {
      book,
      libraries: libsWithAvail,
      affiliates: affiliateLinks,
      cachedAt: new Date().toISOString(),
    }
  }
}
