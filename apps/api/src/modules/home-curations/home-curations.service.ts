import { Injectable, Logger } from '@nestjs/common'
import { and, asc, db, desc, eq, homeCurations } from '@nearbook/db'
import { JeongbonaruService } from '../jeongbonaru/jeongbonaru.service'

type HomeCurationSection = 'monthly_keywords' | 'loan_item_books' | 'hot_trend_books'

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
  loanCount?: number
  difference?: number
  baseWeekRank?: number
  pastWeekRank?: number
}

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

  private async findLatestPeriodKey(section: HomeCurationSection) {
    const [row] = await db
      .select({ periodKey: homeCurations.periodKey })
      .from(homeCurations)
      .where(eq(homeCurations.section, section))
      .orderBy(desc(homeCurations.periodKey))
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

  private formatDateInKst(date: Date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  }
}
