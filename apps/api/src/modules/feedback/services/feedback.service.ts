import { Injectable } from '@nestjs/common'
import { db, users, feedback, eq, desc } from '@nearbook/db'
import { CreateFeedbackDto } from '../dto/create-feedback.dto'

@Injectable()
export class FeedbackService {
  async create(args: {
    dto: CreateFeedbackDto
    supabaseUserId: string | null
    userAgent?: string
  }) {
    let userId: number | null = null
    if (args.supabaseUserId) {
      const [u] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.supabaseUserId, args.supabaseUserId))
        .limit(1)
      userId = u?.id ?? null
    }

    const [row] = await db
      .insert(feedback)
      .values({
        userId,
        category: args.dto.category,
        title: args.dto.title,
        body: args.dto.body,
        contactEmail: args.dto.contactEmail ?? null,
        pageUrl: args.dto.pageUrl ?? null,
        userAgent: args.userAgent?.slice(0, 512) ?? null,
      })
      .returning({
        id: feedback.id,
        category: feedback.category,
        title: feedback.title,
        status: feedback.status,
        createdAt: feedback.createdAt,
      })

    return row
  }

  async listByUser(supabaseUserId: string) {
    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.supabaseUserId, supabaseUserId))
      .limit(1)
    if (!u) return []

    return db
      .select({
        id: feedback.id,
        category: feedback.category,
        title: feedback.title,
        status: feedback.status,
        createdAt: feedback.createdAt,
      })
      .from(feedback)
      .where(eq(feedback.userId, u.id))
      .orderBy(desc(feedback.createdAt))
  }
}
