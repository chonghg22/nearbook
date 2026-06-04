import { Injectable, ForbiddenException } from '@nestjs/common'
import { db, users, wishlists, bookCache, eq, and, desc, count } from '@nearbook/db'
import { AddWishlistDto, UpdateWishlistDto } from '../dto'

@Injectable()
export class WishlistsService {
  async listByUser(supabaseUserId: string) {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId))
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

    return {
      data: items,
      meta: { total: items.length, plan: user.plan, limit: user.plan === 'free' ? 10 : null },
    }
  }

  async add(supabaseUserId: string, email: string | undefined, dto: AddWishlistDto) {
    const user = await this.getOrCreateUser(supabaseUserId, email)

    const [countResult] = await db
      .select({ value: count() })
      .from(wishlists)
      .where(eq(wishlists.userId, user.id))

    const currentCount = Number(countResult.value)

    if (user.plan === 'free' && currentCount >= 10) {
      throw new ForbiddenException('Pro plan required: wishlist limit (10) exceeded')
    }

    const [row] = await db
      .insert(wishlists)
      .values({ userId: user.id, isbn: dto.isbn, note: dto.note })
      .onConflictDoNothing()
      .returning()

    return { data: row }
  }

  async getStatus(supabaseUserId: string, isbn: string) {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId))
    if (!user) return { data: { added: false } }

    const [item] = await db
      .select({ id: wishlists.id })
      .from(wishlists)
      .where(and(eq(wishlists.userId, user.id), eq(wishlists.isbn, isbn)))
      .limit(1)

    return { data: { added: Boolean(item), id: item?.id ?? null } }
  }

  async update(supabaseUserId: string, isbn: string, dto: UpdateWishlistDto) {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId))
    if (!user) return

    const [row] = await db
      .update(wishlists)
      .set({ note: dto.note })
      .where(and(eq(wishlists.userId, user.id), eq(wishlists.isbn, isbn)))
      .returning()

    return { data: row }
  }

  async remove(supabaseUserId: string, isbn: string) {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId))
    if (!user) return

    await db
      .delete(wishlists)
      .where(and(eq(wishlists.userId, user.id), eq(wishlists.isbn, isbn)))
  }

  private async getOrCreateUser(supabaseUserId: string, email?: string) {
    let user = await db.query.users.findFirst({
      where: eq(users.supabaseUserId, supabaseUserId),
    })

    if (!user) {
      const safeEmail = email?.trim() || `${supabaseUserId}@users.nearbook.local`
      const [created] = await db
        .insert(users)
        .values({
          supabaseUserId,
          email: safeEmail,
          nickname: null,
        })
        .returning()
      
      user = created
    }
    return user
  }
}
