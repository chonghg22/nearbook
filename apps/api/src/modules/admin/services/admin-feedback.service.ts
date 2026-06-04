import { Injectable, NotFoundException } from '@nestjs/common'
import { and, count, db, desc, eq, feedback, ilike, users } from '@nearbook/db'
import { AdminListFeedbackDto } from '../dto/admin-list-feedback.dto'

@Injectable()
export class AdminFeedbackService {
  async list(query: AdminListFeedbackDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const offset = (page - 1) * pageSize
    const conditions = []

    if (query.category) conditions.push(eq(feedback.category, query.category))
    if (query.status) conditions.push(eq(feedback.status, query.status))
    if (query.q?.trim()) {
      conditions.push(
        ilike(feedback.title, `%${query.q.trim()}%`),
      )
    }

    const where = conditions.length ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: feedback.id,
          category: feedback.category,
          title: feedback.title,
          status: feedback.status,
          contactEmail: feedback.contactEmail,
          createdAt: feedback.createdAt,
        })
        .from(feedback)
        .where(where)
        .orderBy(desc(feedback.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(feedback).where(where),
    ])

    return { data: items, meta: { total, page, pageSize } }
  }

  async getById(id: number) {
    const [row] = await db
      .select({
        id: feedback.id,
        category: feedback.category,
        title: feedback.title,
        body: feedback.body,
        status: feedback.status,
        contactEmail: feedback.contactEmail,
        pageUrl: feedback.pageUrl,
        userAgent: feedback.userAgent,
        createdAt: feedback.createdAt,
        userId: feedback.userId,
      })
      .from(feedback)
      .where(eq(feedback.id, id))
      .limit(1)

    if (!row) throw new NotFoundException('Feedback not found')

    const relatedUser = row.userId
      ? await db
          .select({
            id: users.id,
            email: users.email,
            nickname: users.nickname,
            plan: users.plan,
          })
          .from(users)
          .where(eq(users.id, row.userId))
          .limit(1)
      : []

    return { data: { ...row, user: relatedUser[0] ?? null } }
  }

  async updateStatus(id: number, status: string) {
    const [row] = await db
      .update(feedback)
      .set({ status })
      .where(eq(feedback.id, id))
      .returning({
        id: feedback.id,
        status: feedback.status,
      })

    if (!row) throw new NotFoundException('Feedback not found')
    return { data: row }
  }
}
