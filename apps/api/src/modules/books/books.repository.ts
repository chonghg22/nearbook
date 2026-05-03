import { Injectable } from '@nestjs/common'
import { db, bookCache, popularBooks, eq, desc } from '@nearbook/db'

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
}
