import { Injectable } from '@nestjs/common'
import { db, bookCache, popularBooks, eq, desc } from '@nearbook/db'

@Injectable()
export class BooksRepository {
  async findByIsbn(isbn: string) {
    return db.query.bookCache.findFirst({ where: eq(bookCache.isbn, isbn) })
  }

  async getPopular(region = '전국', limit = 10) {
    return db.query.popularBooks.findMany({
      where: eq(popularBooks.region, region),
      orderBy: [desc(popularBooks.loanCount)],
      limit,
    })
  }
}
