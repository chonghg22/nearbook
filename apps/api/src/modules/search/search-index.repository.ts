import { Injectable } from '@nestjs/common'
import { db, sql } from '@nearbook/db'

export type IndexBook = {
  isbn: string
  title: string
  author?: string | null
  publisher?: string | null
  category?: string | null
  coverUrl?: string | null
  publishedYear?: number | null
  popularityScore?: number
}
type Reader = Pick<typeof db, 'execute'>

/** Only stored public metadata; never calls a provider or writes source tables. */
@Injectable()
export class SearchIndexRepository {
  async snapshot<T>(read: (reader: Reader) => Promise<T>): Promise<T> {
    return db.transaction(
      async (tx) => {
        await tx.execute(sql`SET LOCAL statement_timeout = '15s'`)
        await tx.execute(sql`SET LOCAL idle_in_transaction_session_timeout = '30s'`)
        return read(tx)
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' }
    )
  }

  async page(after: string, limit: number, reader: Reader = db): Promise<IndexBook[]> {
    return [
      ...(await reader.execute<IndexBook>(sql`
      SELECT isbn, title, author, publisher, category, cover_url AS "coverUrl",
        published_year AS "publishedYear"
      FROM nearbook.book_cache WHERE isbn > ${after}
      ORDER BY isbn LIMIT ${limit}
    `)),
    ]
  }

  async byIsbns(isbns: string[]): Promise<IndexBook[]> {
    if (!isbns.length) return []
    return [
      ...(await db.execute<IndexBook>(sql`
      SELECT isbn, title, author, publisher, category, cover_url AS "coverUrl",
        published_year AS "publishedYear"
      FROM nearbook.book_cache WHERE isbn IN (${sql.join(
        isbns.map((isbn) => sql`${isbn}`),
        sql`, `
      )})
    `)),
    ]
  }

  async popularity(reader: Reader) {
    const rows = await reader.execute<{ isbn: string; rank: number; period: string }>(sql`
      SELECT isbn, min(rank)::int AS rank, period FROM nearbook.popular_books
      WHERE region = '전국'
        AND period = (SELECT max(period) FROM nearbook.popular_books WHERE region = '전국')
        AND rank BETWEEN 1 AND 10000
      GROUP BY isbn, period
    `)
    return {
      period: rows[0]?.period ?? null,
      scores: new Map(rows.map((row) => [row.isbn, 10001 - row.rank])),
    }
  }
}
