import { Injectable, NotFoundException } from '@nestjs/common'
import { and, count, db, desc, eq, ilike, notices, sql } from '@nearbook/db'
import { AdminListNoticesDto } from '../dto/admin-list-notices.dto'
import { CreateAdminNoticeDto } from '../dto/create-admin-notice.dto'
import { UpdateAdminNoticeDto } from '../dto/update-admin-notice.dto'

@Injectable()
export class AdminNoticesService {
  async list(query: AdminListNoticesDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const offset = (page - 1) * pageSize
    const conditions = []

    if (query.category) conditions.push(eq(notices.category, query.category))
    if (query.isPublished !== undefined) conditions.push(eq(notices.isPublished, query.isPublished))
    if (query.q?.trim()) conditions.push(ilike(notices.title, `%${query.q.trim()}%`))

    const where = conditions.length ? and(...conditions) : undefined
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: notices.id,
          title: notices.title,
          category: notices.category,
          isPinned: notices.isPinned,
          isPublished: notices.isPublished,
          publishedAt: notices.publishedAt,
          updatedAt: notices.updatedAt,
        })
        .from(notices)
        .where(where)
        .orderBy(desc(notices.isPinned), desc(notices.publishedAt), desc(notices.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(notices).where(where),
    ])

    return { data: items, meta: { total, page, pageSize } }
  }

  async getById(id: number) {
    const [row] = await db.select().from(notices).where(eq(notices.id, id)).limit(1)
    if (!row) throw new NotFoundException('Notice not found')
    return { data: row }
  }

  async create(dto: CreateAdminNoticeDto) {
    const now = new Date()
    const [row] = await db
      .insert(notices)
      .values({
        title: dto.title,
        content: dto.content,
        category: dto.category ?? 'general',
        isPinned: dto.isPinned ?? false,
        isPublished: dto.isPublished ?? true,
        publishedAt: dto.isPublished === false ? now : now,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return { data: row }
  }

  async update(id: number, dto: UpdateAdminNoticeDto) {
    const [row] = await db
      .update(notices)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
        ...(dto.isPublished !== undefined && {
          isPublished: dto.isPublished,
          publishedAt: dto.isPublished ? new Date() : sql`${notices.publishedAt}`,
        }),
        updatedAt: new Date(),
      })
      .where(eq(notices.id, id))
      .returning()

    if (!row) throw new NotFoundException('Notice not found')
    return { data: row }
  }

  async setPublish(id: number, isPublished: boolean) {
    const [row] = await db
      .update(notices)
      .set({
        isPublished,
        ...(isPublished ? { publishedAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(notices.id, id))
      .returning()

    if (!row) throw new NotFoundException('Notice not found')
    return { data: row }
  }
}
