import { Injectable, NotFoundException } from '@nestjs/common'
import { and, count, db, desc, eq, feedback, ilike, libraryCards, users, wishlists } from '@nearbook/db'
import { PaginationQueryDto } from './dto/pagination-query.dto'

@Injectable()
export class AdminUsersService {
  async list(query: PaginationQueryDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const offset = (page - 1) * pageSize
    const conditions = []

    if (query.q?.trim()) {
      conditions.push(ilike(users.email, `%${query.q.trim()}%`))
    }

    const where = conditions.length ? and(...conditions) : undefined
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: users.id,
          supabaseUserId: users.supabaseUserId,
          email: users.email,
          nickname: users.nickname,
          region: users.region,
          plan: users.plan,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(users).where(where),
    ])

    return { data: items, meta: { total, page, pageSize } }
  }

  async getById(id: number) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
    if (!user) throw new NotFoundException('User not found')

    const [[wishlistCount], [libraryCardCount], [feedbackCount]] = await Promise.all([
      db.select({ count: count() }).from(wishlists).where(eq(wishlists.userId, id)),
      db.select({ count: count() }).from(libraryCards).where(eq(libraryCards.userId, id)),
      db.select({ count: count() }).from(feedback).where(eq(feedback.userId, id)),
    ])

    return {
      data: {
        ...user,
        stats: {
          wishlistCount: wishlistCount.count,
          libraryCardCount: libraryCardCount.count,
          feedbackCount: feedbackCount.count,
        },
      },
    }
  }
}
