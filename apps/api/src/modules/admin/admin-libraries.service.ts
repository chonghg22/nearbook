import { Injectable, NotFoundException } from '@nestjs/common'
import { and, count, db, desc, eq, ilike, libraries, libraryCards } from '@nearbook/db'
import { PaginationQueryDto } from './dto/pagination-query.dto'

@Injectable()
export class AdminLibrariesService {
  async list(query: PaginationQueryDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const offset = (page - 1) * pageSize
    const conditions = []

    if (query.q?.trim()) {
      conditions.push(ilike(libraries.name, `%${query.q.trim()}%`))
    }

    const where = conditions.length ? and(...conditions) : undefined
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: libraries.id,
          name: libraries.name,
          region: libraries.region,
          address: libraries.address,
          homepage: libraries.homepage,
          updatedAt: libraries.updatedAt,
        })
        .from(libraries)
        .where(where)
        .orderBy(desc(libraries.updatedAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(libraries).where(where),
    ])

    return { data: items, meta: { total, page, pageSize } }
  }

  async getById(id: number) {
    const [library] = await db.select().from(libraries).where(eq(libraries.id, id)).limit(1)
    if (!library) throw new NotFoundException('Library not found')

    const [{ count: followerCount }] = await db
      .select({ count: count() })
      .from(libraryCards)
      .where(eq(libraryCards.libraryId, id))

    return {
      data: {
        ...library,
        stats: {
          libraryCardCount: followerCount,
        },
      },
    }
  }
}
