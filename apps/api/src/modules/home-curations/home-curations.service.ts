import { Injectable, Logger } from '@nestjs/common'
import {
  and,
  asc,
  categoryCurations,
  db,
  desc,
  eq,
  homeCurations,
  libraries,
  libraryCurations,
  sql,
} from '@nearbook/db'
import { JeongbonaruService } from '../jeongbonaru/jeongbonaru.service'

type HomeCurationSection = 'monthly_keywords' | 'loan_item_books' | 'hot_trend_books'
type LibraryCurationSection = 'new_arrivals'

type MonthlyKeywordItem = {
  word: string
  weight: number
}

type BookItem = {
  isbn: string
  title: string
  author: string | null
  publisher: string | null
  coverUrl: string | null
  category?: string | null
  loanCount?: number
  difference?: number
  baseWeekRank?: number
  pastWeekRank?: number
}

type NewArrivalBookItem = BookItem & {
  category?: string | null
}

export const BOOK_CATEGORY_GROUPS = [
  { code: '8', name: '문학', description: '소설, 시, 에세이 등 문학 분야 인기 도서' },
  { code: '3', name: '사회과학', description: '경제, 경영, 정치, 사회 이슈 도서' },
  { code: '9', name: '역사', description: '역사, 지리, 여행 분야 도서' },
  { code: '1', name: '철학', description: '철학, 심리학, 윤리 분야 도서' },
  { code: '4', name: '자연과학', description: '수학, 과학, 생명과학 분야 도서' },
  { code: '5', name: '기술과학', description: '의학, 공학, 생활과학 분야 도서' },
  { code: '6', name: '예술', description: '미술, 음악, 스포츠, 취미 분야 도서' },
  { code: '7', name: '언어', description: '한국어, 외국어, 학습 언어 도서' },
  { code: '2', name: '종교', description: '종교와 신앙 분야 도서' },
  { code: '0', name: '총류', description: '컴퓨터, 독서, 백과, 정보 분야 도서' },
] as const

export type BookCategoryCode = typeof BOOK_CATEGORY_GROUPS[number]['code']

@Injectable()
export class HomeCurationsService {
  private readonly logger = new Logger(HomeCurationsService.name)

  constructor(private readonly jeongbonaru: JeongbonaruService) {}

  async getMonthlyKeywords(limit = 10, month?: string): Promise<MonthlyKeywordItem[]> {
    const rows = await this.findRows('monthly_keywords', limit, month)
    return rows
      .filter((row) => row.word)
      .map((row) => ({
        word: row.word!,
        weight: row.weight ?? 0,
      }))
  }

  async getLoanItemBooks(limit = 10): Promise<BookItem[]> {
    const rows = await this.findRows('loan_item_books', limit)
    return rows
      .filter((row) => row.isbn && row.title)
      .map((row) => ({
        isbn: row.isbn!,
        title: row.title!,
        author: row.author,
        publisher: row.publisher,
        coverUrl: row.coverUrl,
        loanCount: row.loanCount ?? 0,
      }))
  }

  async getHotTrendBooks(limit = 10, searchDt?: string): Promise<BookItem[]> {
    const rows = await this.findRows('hot_trend_books', limit, searchDt)
    return rows
      .filter((row) => row.isbn && row.title)
      .map((row) => ({
        isbn: row.isbn!,
        title: row.title!,
        author: row.author,
        publisher: row.publisher,
        coverUrl: row.coverUrl,
        difference: row.difference ?? 0,
        baseWeekRank: row.baseWeekRank ?? 0,
        pastWeekRank: row.pastWeekRank ?? 0,
      }))
  }

  async refreshDailyBookCurations(limit = 20) {
    const [loanItems, hotTrend] = await Promise.allSettled([
      this.refreshLoanItemBooks(limit),
      this.refreshHotTrendBooks(limit),
    ])

    return {
      loanItemBooks: loanItems.status === 'fulfilled' ? loanItems.value : { refreshed: false, count: 0 },
      hotTrendBooks: hotTrend.status === 'fulfilled' ? hotTrend.value : { refreshed: false, count: 0 },
    }
  }

  async getLibraryNewArrivals(libraryId: number, limit = 20, periodKey?: string): Promise<BookItem[]> {
    const rows = await this.findLibraryRows(libraryId, 'new_arrivals', limit, periodKey)
    return rows
      .filter((row) => row.isbn && row.title)
      .map((row) => ({
        isbn: row.isbn!,
        title: row.title!,
        author: row.author,
        publisher: row.publisher,
        coverUrl: row.coverUrl,
      }))
  }

  async getCategories() {
    const latestPeriodKey = await this.findLatestCategoryPeriodKey()
    if (!latestPeriodKey) {
      return BOOK_CATEGORY_GROUPS.map((category) => ({
        ...category,
        count: 0,
      }))
    }

    const counts = await db
      .select({
        categoryCode: categoryCurations.categoryCode,
        count: sql<number>`count(*)::int`,
      })
      .from(categoryCurations)
      .where(eq(categoryCurations.periodKey, latestPeriodKey))
      .groupBy(categoryCurations.categoryCode)

    const countMap = new Map(counts.map((row) => [row.categoryCode, Number(row.count)]))
    return BOOK_CATEGORY_GROUPS.map((category) => ({
      ...category,
      count: countMap.get(category.code) ?? 0,
      periodKey: latestPeriodKey,
    }))
  }

  async getCategoryBooks(categoryCode: string, limit = 40, periodKey?: string): Promise<BookItem[]> {
    const targetPeriodKey = periodKey ?? await this.findLatestCategoryPeriodKey(categoryCode)
    if (!targetPeriodKey) return []

    const rows = await db
      .select()
      .from(categoryCurations)
      .where(and(eq(categoryCurations.categoryCode, categoryCode), eq(categoryCurations.periodKey, targetPeriodKey)))
      .orderBy(asc(categoryCurations.rank))
      .limit(limit)

    return rows.map((row) => ({
      isbn: row.isbn,
      title: row.title,
      author: row.author,
      publisher: row.publisher,
      coverUrl: row.coverUrl,
      category: row.categoryName,
      loanCount: row.loanCount ?? 0,
    }))
  }

  async refreshMonthlyKeywords(limit = 10, month = this.getPreviousMonthInKst()) {
    try {
      const keywords = await this.jeongbonaru.getMonthlyKeywords(limit, month)
      if (keywords.length === 0) {
        this.logger.warn(`monthly_keywords refresh skipped: empty response (${month})`)
        return { refreshed: false, count: 0, periodKey: month }
      }

      await this.replaceSection(
        'monthly_keywords',
        month,
        keywords.map((item, index) => ({
          section: 'monthly_keywords',
          periodKey: month,
          rank: index + 1,
          word: item.word,
          weight: item.weight,
          sourceDate: month,
        })),
      )

      return { refreshed: true, count: keywords.length, periodKey: month }
    } catch (err) {
      this.logger.warn(`monthly_keywords refresh failed: ${String(err)}`)
      return { refreshed: false, count: 0, periodKey: month }
    }
  }

  async refreshCategoryCurations(limit = 40, periodKey = this.getCurrentMonthInKst()) {
    const results = []
    for (const category of BOOK_CATEGORY_GROUPS) {
      results.push(await this.refreshCategoryCuration(category.code, limit, periodKey))
    }

    return {
      refreshed: results.filter((result) => result.refreshed).length,
      skipped: results.filter((result) => !result.refreshed).length,
      periodKey,
    }
  }

  async refreshCategoryCuration(categoryCode: BookCategoryCode, limit = 40, periodKey = this.getCurrentMonthInKst()) {
    const category = BOOK_CATEGORY_GROUPS.find((item) => item.code === categoryCode)
    if (!category) return { refreshed: false, count: 0, categoryCode, periodKey }

    try {
      const books = await this.jeongbonaru.getLoanItemBooks(limit, { kdc: categoryCode })
      if (books.length === 0) {
        this.logger.warn(`category_curations refresh skipped: empty response (${category.name}, ${periodKey})`)
        return { refreshed: false, count: 0, categoryCode, periodKey }
      }

      await this.replaceCategorySection(
        categoryCode,
        periodKey,
        books.map((book, index) => ({
          categoryCode,
          categoryName: category.name,
          periodKey,
          rank: index + 1,
          isbn: book.isbn,
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          coverUrl: book.coverUrl,
          loanCount: book.loanCount,
          sourceDate: periodKey,
        })),
      )

      return { refreshed: true, count: books.length, categoryCode, periodKey }
    } catch (err) {
      this.logger.warn(`category_curations refresh failed: ${category.name} (${String(err)})`)
      return { refreshed: false, count: 0, categoryCode, periodKey }
    }
  }

  async refreshLoanItemBooks(limit = 20, periodKey = this.getTodayInKst()) {
    try {
      const books = await this.jeongbonaru.getLoanItemBooks(limit)
      if (books.length === 0) {
        this.logger.warn(`loan_item_books refresh skipped: empty response (${periodKey})`)
        return { refreshed: false, count: 0, periodKey }
      }

      await this.replaceSection(
        'loan_item_books',
        periodKey,
        books.map((book, index) => ({
          section: 'loan_item_books',
          periodKey,
          rank: index + 1,
          isbn: book.isbn,
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          coverUrl: book.coverUrl,
          loanCount: book.loanCount,
          sourceDate: periodKey,
        })),
      )

      return { refreshed: true, count: books.length, periodKey }
    } catch (err) {
      this.logger.warn(`loan_item_books refresh failed: ${String(err)}`)
      return { refreshed: false, count: 0, periodKey }
    }
  }

  async refreshHotTrendBooks(limit = 20, periodKey = this.getYesterdayInKst()) {
    try {
      const books = await this.jeongbonaru.getHotTrendBooks(limit, periodKey)
      if (books.length === 0) {
        this.logger.warn(`hot_trend_books refresh skipped: empty response (${periodKey})`)
        return { refreshed: false, count: 0, periodKey }
      }

      await this.replaceSection(
        'hot_trend_books',
        periodKey,
        books.map((book, index) => ({
          section: 'hot_trend_books',
          periodKey,
          rank: index + 1,
          isbn: book.isbn,
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          coverUrl: book.coverUrl,
          difference: book.difference,
          baseWeekRank: book.baseWeekRank,
          pastWeekRank: book.pastWeekRank,
          sourceDate: periodKey,
        })),
      )

      return { refreshed: true, count: books.length, periodKey }
    } catch (err) {
      this.logger.warn(`hot_trend_books refresh failed: ${String(err)}`)
      return { refreshed: false, count: 0, periodKey }
    }
  }

  async refreshFeaturedLibraryNewArrivals(bookLimit = 40, libraryLimit = 12, periodKey = this.getCurrentMonthInKst()) {
    const results = []
    const pageSize = 100
    const maxPages = 5

    for (let pageNo = 1; pageNo <= maxPages && results.filter((result) => result.refreshed).length < libraryLimit; pageNo++) {
      const librariesFromApi = await this.jeongbonaru.listLibraries(pageNo, pageSize)
      if (librariesFromApi.length === 0) break

      for (const library of librariesFromApi) {
        if (results.filter((result) => result.refreshed).length >= libraryLimit) break

        const libraryId = Number.parseInt(library.libCode ?? '0', 10)
        if (!libraryId) continue

        const exists = await db.query.libraries.findFirst({
          where: eq(libraries.id, libraryId),
          columns: { id: true },
        })
        if (!exists) continue

        results.push(await this.refreshLibraryNewArrivals(libraryId, bookLimit, periodKey))
      }

      if (librariesFromApi.length < pageSize) break
    }

    return {
      refreshed: results.filter((result) => result.refreshed).length,
      skipped: results.filter((result) => !result.refreshed).length,
      periodKey,
    }
  }

  async refreshLibraryNewArrivals(libraryId: number, limit = 40, periodKey = this.getCurrentMonthInKst()) {
    try {
      const books: NewArrivalBookItem[] = await this.jeongbonaru.getLibraryNewArrivalBooks(libraryId, limit, periodKey)
      if (books.length === 0) {
        this.logger.warn(`new_arrivals refresh skipped: empty response (${libraryId}, ${periodKey})`)
        return { refreshed: false, count: 0, libraryId, periodKey }
      }

      await this.replaceLibrarySection(
        libraryId,
        'new_arrivals',
        periodKey,
        books.map((book, index) => ({
          libraryId,
          section: 'new_arrivals',
          periodKey,
          rank: index + 1,
          isbn: book.isbn,
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          coverUrl: book.coverUrl,
          category: book.category,
          sourceDate: periodKey,
        })),
      )

      return { refreshed: true, count: books.length, libraryId, periodKey }
    } catch (err) {
      this.logger.warn(`new_arrivals refresh failed: ${libraryId} (${String(err)})`)
      return { refreshed: false, count: 0, libraryId, periodKey }
    }
  }

  private async findRows(section: HomeCurationSection, limit: number, periodKey?: string) {
    const targetPeriodKey = periodKey ?? await this.findLatestPeriodKey(section)
    if (!targetPeriodKey) return []

    return db
      .select()
      .from(homeCurations)
      .where(and(eq(homeCurations.section, section), eq(homeCurations.periodKey, targetPeriodKey)))
      .orderBy(asc(homeCurations.rank))
      .limit(limit)
  }

  private async findLibraryRows(
    libraryId: number,
    section: LibraryCurationSection,
    limit: number,
    periodKey?: string,
  ) {
    const targetPeriodKey = periodKey ?? await this.findLatestLibraryPeriodKey(libraryId, section)
    if (!targetPeriodKey) return []

    return db
      .select()
      .from(libraryCurations)
      .where(
        and(
          eq(libraryCurations.libraryId, libraryId),
          eq(libraryCurations.section, section),
          eq(libraryCurations.periodKey, targetPeriodKey),
        ),
      )
      .orderBy(asc(libraryCurations.rank))
      .limit(limit)
  }

  private async findLatestPeriodKey(section: HomeCurationSection) {
    const [row] = await db
      .select({ periodKey: homeCurations.periodKey })
      .from(homeCurations)
      .where(eq(homeCurations.section, section))
      .orderBy(desc(homeCurations.periodKey))
      .limit(1)

    return row?.periodKey
  }

  private async findLatestLibraryPeriodKey(libraryId: number, section: LibraryCurationSection) {
    const [row] = await db
      .select({ periodKey: libraryCurations.periodKey })
      .from(libraryCurations)
      .where(and(eq(libraryCurations.libraryId, libraryId), eq(libraryCurations.section, section)))
      .orderBy(desc(libraryCurations.periodKey))
      .limit(1)

    return row?.periodKey
  }

  private async findLatestCategoryPeriodKey(categoryCode?: string) {
    const [row] = categoryCode
      ? await db
        .select({ periodKey: categoryCurations.periodKey })
        .from(categoryCurations)
        .where(eq(categoryCurations.categoryCode, categoryCode))
        .orderBy(desc(categoryCurations.periodKey))
        .limit(1)
      : await db
        .select({ periodKey: categoryCurations.periodKey })
        .from(categoryCurations)
        .orderBy(desc(categoryCurations.periodKey))
        .limit(1)

    return row?.periodKey
  }

  private async replaceSection(
    section: HomeCurationSection,
    periodKey: string,
    rows: Array<typeof homeCurations.$inferInsert>,
  ) {
    await db.transaction(async (tx) => {
      await tx
        .delete(homeCurations)
        .where(and(eq(homeCurations.section, section), eq(homeCurations.periodKey, periodKey)))

      await tx.insert(homeCurations).values(rows)
    })
  }

  private async replaceLibrarySection(
    libraryId: number,
    section: LibraryCurationSection,
    periodKey: string,
    rows: Array<typeof libraryCurations.$inferInsert>,
  ) {
    await db.transaction(async (tx) => {
      await tx
        .delete(libraryCurations)
        .where(
          and(
            eq(libraryCurations.libraryId, libraryId),
            eq(libraryCurations.section, section),
            eq(libraryCurations.periodKey, periodKey),
          ),
        )

      await tx.insert(libraryCurations).values(rows)
    })
  }

  private async replaceCategorySection(
    categoryCode: string,
    periodKey: string,
    rows: Array<typeof categoryCurations.$inferInsert>,
  ) {
    await db.transaction(async (tx) => {
      await tx
        .delete(categoryCurations)
        .where(and(eq(categoryCurations.categoryCode, categoryCode), eq(categoryCurations.periodKey, periodKey)))

      await tx.insert(categoryCurations).values(rows)
    })
  }

  private getTodayInKst() {
    return this.formatDateInKst(new Date())
  }

  private getYesterdayInKst() {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    return this.formatDateInKst(date)
  }

  private getPreviousMonthInKst() {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
    }).format(date)
  }

  private getCurrentMonthInKst() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
    }).format(new Date())
  }

  private formatDateInKst(date: Date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  }
}
