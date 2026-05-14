import { Injectable } from '@nestjs/common'
import { db, bookCache, popularBooks, eq, desc, asc, sql, inArray } from '@nearbook/db'

@Injectable()
export class BooksRepository {
  async findByIsbn(isbn: string) {
    return db.query.bookCache.findFirst({ where: eq(bookCache.isbn, isbn) })
  }

  async getPopular(region = '전국', limit = 10) {
    // popular_books와 book_cache 조인
    const result = await db
      .select({
        isbn: popularBooks.isbn,
        title: bookCache.title,
        author: bookCache.author,
        coverUrl: bookCache.coverUrl,
        loanCount: popularBooks.loanCount,
      })
      .from(popularBooks)
      .innerJoin(bookCache, eq(popularBooks.isbn, bookCache.isbn))
      .where(eq(popularBooks.region, region))
      .orderBy(desc(popularBooks.loanCount))
      .limit(limit)

    return result
  }

  async getRecent(limit = 10) {
    return db.query.bookCache.findMany({
      orderBy: [desc(bookCache.cachedAt)],
      limit,
    })
  }

  async getCategories(limit = 30) {
    const rows = await db
      .select({
        category: bookCache.category,
        count: sql<number>`count(*)::int`,
      })
      .from(bookCache)
      .where(sql`${bookCache.category} IS NOT NULL AND ${bookCache.category} <> ''`)
      .groupBy(bookCache.category)
      .orderBy(desc(sql`count(*)`), asc(bookCache.category))
      .limit(limit)

    return rows.filter((row): row is { category: string; count: number } => Boolean(row.category))
  }

  async findCoversByIsbns(isbns: string[]): Promise<Map<string, string>> {
    if (isbns.length === 0) return new Map()
    const rows = await db
      .select({ isbn: bookCache.isbn, coverUrl: bookCache.coverUrl })
      .from(bookCache)
      .where(inArray(bookCache.isbn, isbns))
    const map = new Map<string, string>()
    for (const row of rows) {
      if (row.coverUrl) map.set(row.isbn, row.coverUrl)
    }
    return map
  }

  async getByCategory(category: string, limit = 40) {
    return db
      .select({
        isbn: bookCache.isbn,
        title: bookCache.title,
        author: bookCache.author,
        publisher: bookCache.publisher,
        coverUrl: bookCache.coverUrl,
        category: bookCache.category,
        cachedAt: bookCache.cachedAt,
      })
      .from(bookCache)
      .where(eq(bookCache.category, category))
      .orderBy(desc(bookCache.cachedAt))
      .limit(limit)
  }
}
