import { Injectable } from '@nestjs/common'
import { db, notices, eq, and, desc, count, sql } from '@nearbook/db'
import { ListNoticesDto } from './dto/list-notices.dto'

@Injectable()
export class NoticesService {
  async list(query: ListNoticesDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const offset = (page - 1) * pageSize

    const where = query.category
      ? and(eq(notices.isPublished, true), eq(notices.category, query.category))
      : eq(notices.isPublished, true)

    const items = await db
      .select({
        id: notices.id,
        title: notices.title,
        category: notices.category,
        isPinned: notices.isPinned,
        publishedAt: notices.publishedAt,
      })
      .from(notices)
      .where(where)
      .orderBy(desc(notices.isPinned), desc(notices.publishedAt))
      .limit(pageSize)
      .offset(offset)

    const [{ total }] = await db
      .select({ total: count() })
      .from(notices)
      .where(where)
    return { items, total }
  }

  async getById(id: number) {
    const [row] = await db
      .select()
      .from(notices)
      .where(and(eq(notices.id, id), eq(notices.isPublished, true)))
      .limit(1)
    return row ?? null
  }

  async getAllPublishedIds(): Promise<number[]> {
    const rows = await db
      .select({ id: notices.id })
      .from(notices)
      .where(eq(notices.isPublished, true))
    return rows.map((r) => r.id)
  }
}
