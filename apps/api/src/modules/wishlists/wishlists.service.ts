import { Injectable, ForbiddenException } from '@nestjs/common'
import { db, users, wishlists, bookCache, eq, and, desc, count } from '@nearbook/db'

@Injectable()
export class WishlistsService {
  async listByUser(supabaseUserId: string) {
    const user = await this.getUser(supabaseUserId)
    if (!user) return { data: [] }

    const items = await db
      .select({
        isbn: wishlists.isbn,
        addedAt: wishlists.addedAt,
        note: wishlists.note,
        title: bookCache.title,
        author: bookCache.author,
        coverUrl: bookCache.coverUrl,
      })
      .from(wishlists)
      .leftJoin(bookCache, eq(wishlists.isbn, bookCache.isbn))
      .where(eq(wishlists.userId, user.id))
      .orderBy(desc(wishlists.addedAt))

    return { data: items }
  }

  async add(supabaseUserId: string, dto: { isbn: string; note?: string }) {
    const user = await this.getOrCreateUser(supabaseUserId)

    const [countResult] = await db
      .select({ cnt: count() })
      .from(wishlists)
      .where(eq(wishlists.userId, user.id))

    if (user.plan === 'free' && Number(countResult.cnt) >= 10) {
      throw new ForbiddenException('Free 플랜은 위시리스트 10개 한도. Pro 구독 필요.')
    }

    const [row] = await db
      .insert(wishlists)
      .values({ userId: user.id, isbn: dto.isbn, note: dto.note ?? null })
      .onConflictDoNothing()
      .returning()

    return { data: row }
  }

  async update(supabaseUserId: string, isbn: string, dto: { note?: string }) {
    const user = await this.getUser(supabaseUserId)
    if (!user) return

    const [row] = await db
      .update(wishlists)
      .set({ note: dto.note ?? null })
      .where(and(eq(wishlists.userId, user.id), eq(wishlists.isbn, isbn)))
      .returning()

    return { data: row }
  }

  async remove(supabaseUserId: string, isbn: string) {
    const user = await this.getUser(supabaseUserId)
    if (!user) return

    await db
      .delete(wishlists)
      .where(and(eq(wishlists.userId, user.id), eq(wishlists.isbn, isbn)))
  }

  private async getUser(supabaseUserId: string) {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId))
    return user ?? null
  }

  private async getOrCreateUser(supabaseUserId: string) {
    let user = await this.getUser(supabaseUserId)
    if (!user) {
      const [created] = await db
        .insert(users)
        .values({ supabaseUserId, email: `${supabaseUserId}@kakao.local` })
        .returning()
      user = created
    }
    return user
  }
}
