import { Injectable, Logger } from '@nestjs/common'
import { db, bookCache, eq, sql } from '@nearbook/db'
import { CacheService } from '../../common/cache/cache.service'
import { JeongbonaruClient } from './jeongbonaru.client'
import {
  BookCacheRow,
  JeongbonaruBookDoc,
  JeongbonaruDocsResponse,
  JeongbonaruHotTrendResponse,
  JeongbonaruLibsResponse,
  JeongbonaruMonthlyKeywordsResponse,
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
          isbn13: isbn,
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
          expiresAt: sql`now() + interval '365 days'`,
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
            expiresAt: sql`now() + interval '365 days'`,
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

  async getLibrariesByBook(isbn: string, region: string | number, limit = 100) {
    const cacheKey = `lib-by-book:${isbn}:${region}:${limit}`
    const cached = this.cache.get<any[]>(cacheKey)
    if (cached) return cached

    const response = await this.client.get<any>('/libSrchByBook', {
      isbn,
      region,
      pageNo: 1,
      pageSize: limit,
    })

    const rows = (response.response?.libs ?? []).map((entry: any) => {
      const lib = entry.lib ?? entry
      return {
        id: Number(lib.libCode),
        name: lib.libName ?? '',
        address: lib.address ?? '',
        phone: lib.tel ?? null,
        homepage: lib.homepage ?? null,
        lat: Number.parseFloat(lib.latitude ?? '0') || null,
        lng: Number.parseFloat(lib.longitude ?? '0') || null,
        closed: lib.closed ?? null,
        operatingHours: lib.operatingTime ?? null,
      }
    }).filter((lib: any) => Number.isFinite(lib.id) && lib.name)

    this.cache.set(cacheKey, rows, 60 * 60 * 1000)
    return rows
  }

  async getBookUsageAnalysis(isbn: string) {
    const cacheKey = `usage-analysis:${isbn}`
    const cached = this.cache.get<any>(cacheKey)
    if (cached) return cached

    const response = await this.client.get<any>('/usageAnalysisList', { isbn13: isbn })
    const data = this.mapUsageAnalysis(response.response ?? response)
    this.cache.set(cacheKey, data, 24 * 60 * 60 * 1000)
    return data
  }

  async getLibraryUsageTrend(libCode: string | number) {
    const cacheKey = `library-trend:${libCode}`
    const cached = this.cache.get<any>(cacheKey)
    if (cached) return cached

    const [days, hours] = await Promise.all([
      this.client.get<any>('/usageTrend', { libCode, type: 'D' }),
      this.client.get<any>('/usageTrend', { libCode, type: 'H' }),
    ])

    const data = {
      dayOfWeek: this.mapTrendResults(days.response?.results),
      hours: this.mapTrendResults(hours.response?.results),
    }
    this.cache.set(cacheKey, data, 24 * 60 * 60 * 1000)
    return data
  }

  async getLibraryNewArrivalBooks(libCode: string | number, limit = 20, searchDt?: string) {
    const cacheKey = `new-arrivals:${libCode}:${searchDt ?? 'current'}:${limit}`
    const cached = this.cache.get<any[]>(cacheKey)
    if (cached) return cached

    const candidateMonths = searchDt ? [searchDt] : [this.getCurrentMonthInKst(), ...this.getRecentMonthsInKst(6)]

    for (const month of candidateMonths) {
      const response = await this.client.get<any>('/newArrivalBook', {
        libCode,
        searchDt: month,
      })

      const rows = (response.response?.docs ?? []).map((entry: any) => {
        const doc = entry.doc ?? entry
        return {
          isbn: doc.isbn13 ?? '',
          title: doc.bookname?.trim() ?? '',
          author: doc.authors ?? null,
          publisher: doc.publisher ?? null,
          publishedYear: doc.publication_year ? Number.parseInt(doc.publication_year, 10) || null : null,
          coverUrl: doc.bookImageURL ?? null,
          category: doc.class_nm ?? null,
          registeredAt: doc.reg_date ?? null,
        }
      }).filter((entry: any) => entry.isbn && entry.title).slice(0, limit)

      if (rows.length > 0) {
        this.cache.set(cacheKey, rows, 24 * 60 * 60 * 1000)
        return rows
      }
    }

    return []
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

  async getLoanItemBooks(limit = 10, options: { kdc?: string } = {}) {
    const kdcParams: Record<string, string> = {}
    if (options.kdc) {
      if (options.kdc.length >= 2) {
        // 2자리 이상 세부주제 → dtl_kdc 파라미터 + 대분류 kdc 필요
        kdcParams.kdc = options.kdc.charAt(0)
        kdcParams.dtl_kdc = options.kdc
      } else {
        kdcParams.kdc = options.kdc
      }
    }
    const response = await this.client.get<JeongbonaruDocsResponse>(
      '/loanItemSrch',
      {
        ...kdcParams,
        pageNo: 1,
        pageSize: limit,
      },
    )

    return (response.response?.docs ?? []).map((entry) => ({
      isbn: entry.doc.isbn13 ?? '',
      title: entry.doc.bookname?.trim() ?? '',
      author: entry.doc.authors ?? null,
      publisher: entry.doc.publisher ?? null,
      coverUrl: entry.doc.bookImageURL ?? null,
      loanCount: Number.parseInt(entry.doc.loan_count ?? '0', 10) || 0,
    }))
      .filter((entry) => entry.isbn && entry.title)
      .slice(0, limit)
  }

  async getMonthlyKeywords(limit = 10, month?: string) {
    const candidateMonths = month
      ? [month]
      : this.getRecentMonthsInKst(3)

    for (const targetMonth of candidateMonths) {
      try {
        const response = await this.client.get<JeongbonaruMonthlyKeywordsResponse>(
          '/monthlyKeywords',
          { month: targetMonth },
        )

        const keywords = (response.response?.keywords ?? [])
          .map((entry) => ({
            word: entry.keyword.word?.trim() ?? '',
            weight:
              typeof entry.keyword.weight === 'number'
                ? entry.keyword.weight
                : Number.parseFloat(entry.keyword.weight ?? '0'),
          }))
          .filter((entry) => entry.word.length > 0 && Number.isFinite(entry.weight))
          .sort((a, b) => b.weight - a.weight)
          .slice(0, limit)

        if (keywords.length > 0) {
          return keywords
        }
      } catch {
        continue
      }
    }

    return []
  }

  async getHotTrendBooks(limit = 10, searchDt?: string) {
    const candidateDates = searchDt
      ? [searchDt]
      : this.getRecentDatesInKst(4)

    for (const targetDate of candidateDates) {
      try {
        const response = await this.client.get<JeongbonaruHotTrendResponse>(
          '/hotTrend',
          { searchDt: targetDate },
        )

        const docs = response.response?.results?.[0]?.result?.docs ?? []
        const items = docs.map((entry) => ({
          isbn: entry.doc.isbn13 ?? '',
          title: entry.doc.bookname?.trim() ?? '',
          author: entry.doc.authors ?? null,
          publisher: entry.doc.publisher ?? null,
          coverUrl: entry.doc.bookImageURL ?? null,
          difference: Number.parseInt(String(entry.doc.difference ?? '0'), 10) || 0,
          baseWeekRank: Number.parseInt(String(entry.doc.baseWeekRank ?? '0'), 10) || 0,
          pastWeekRank: Number.parseInt(String(entry.doc.pastWeekRank ?? '0'), 10) || 0,
        }))
          .filter((entry) => entry.isbn && entry.title)
          .sort((a, b) => b.difference - a.difference)
          .slice(0, limit)

        if (items.length > 0) {
          return items
        }
      } catch {
        continue
      }
    }

    return []
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

  private mapUsageAnalysis(raw: any) {
    const book = raw.book ?? raw.response?.book ?? null
    return {
      book: book ? {
        isbn: book.isbn13 ?? '',
        title: book.bookname ?? '',
        author: book.authors ?? null,
        publisher: book.publisher ?? null,
        publishedYear: book.publication_year ? Number.parseInt(book.publication_year, 10) || null : null,
        coverUrl: book.bookImageURL ?? null,
        description: book.description ?? null,
        category: book.class_nm ?? null,
        loanCount: Number.parseInt(String(book.loanCnt ?? book.loan_count ?? '0'), 10) || 0,
      } : null,
      loanHistory: this.unwrapItems(raw.loanHistory, 'loan').map((loan: any) => ({
        month: loan.month ?? '',
        loanCount: Number.parseInt(String(loan.loanCnt ?? '0'), 10) || 0,
        ranking: Number.parseInt(String(loan.ranking ?? '0'), 10) || 0,
      })).filter((loan: any) => loan.month),
      loanGroups: this.unwrapItems(raw.loanGrps, 'loanGrp').map((group: any) => ({
        age: group.age ?? '',
        gender: group.gender ?? '',
        loanCount: Number.parseInt(String(group.loanCnt ?? '0'), 10) || 0,
        ranking: Number.parseInt(String(group.ranking ?? '0'), 10) || 0,
      })).filter((group: any) => group.age || group.gender),
      keywords: this.unwrapItems(raw.keywords, 'keyword').map((keyword: any) => ({
        word: keyword.word ?? '',
        weight: Number.parseFloat(String(keyword.weight ?? '0')) || 0,
      })).filter((keyword: any) => keyword.word).slice(0, 20),
      coLoanBooks: this.mapAnalysisBooks(this.unwrapItems(raw.coLoanBooks, 'book')).slice(0, 10),
      maniaRecBooks: this.mapAnalysisBooks(this.unwrapItems(raw.maniaRecBooks, 'book')).slice(0, 10),
      readerRecBooks: this.mapAnalysisBooks(this.unwrapItems(raw.readerRecBooks, 'book')).slice(0, 10),
    }
  }

  private mapAnalysisBooks(value: any) {
    return this.toArray(value).map((book: any) => ({
      isbn: book.isbn13 ?? '',
      title: book.bookname?.trim() ?? '',
      author: book.authors ?? null,
      publisher: book.publisher ?? null,
      publishedYear: book.publication_year ? Number.parseInt(book.publication_year, 10) || null : null,
      coverUrl: book.bookImageURL ?? null,
    })).filter((book: any) => book.isbn && book.title)
  }

  private mapTrendResults(value: any) {
    return this.toArray(value).map((entry: any) => {
      const row = entry.result ?? entry
      return {
        dayOfWeek: row.dayOfWeek ?? null,
        hour: row.hour ?? null,
        loan: Number.parseFloat(String(row.loan ?? '0')) || 0,
        return: Number.parseFloat(String(row.return ?? '0')) || 0,
      }
    })
  }

  private unwrapItems(value: any, key: string) {
    return this.toArray(value).map((entry: any) => entry?.[key] ?? entry).filter(Boolean)
  }

  private toArray<T>(value: T | T[] | undefined | null): T[] {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  }

  private getCurrentMonthInKst() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(new Date())

    const year = parts.find((part) => part.type === 'year')?.value
    const month = parts.find((part) => part.type === 'month')?.value

    return `${year}-${month}`
  }

  private getRecentMonthsInKst(count: number) {
    const months: string[] = []
    const now = new Date()

    for (let offset = 1; offset <= count; offset += 1) {
      const date = new Date(now)
      date.setMonth(now.getMonth() - offset)
      months.push(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: '2-digit',
        })
          .formatToParts(date)
          .reduce((acc, part) => {
            if (part.type === 'year') return part.value
            if (part.type === 'month') return `${acc}-${part.value}`
            return acc
          }, ''),
      )
    }

    return months
  }

  private getRecentDatesInKst(days: number) {
    const dates: string[] = []
    const base = new Date()

    for (let offset = 1; offset <= days; offset += 1) {
      const date = new Date(base)
      date.setDate(base.getDate() - offset)
      dates.push(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(date),
      )
    }

    return dates
  }
}
