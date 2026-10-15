import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import {
  db,
  users,
  wishlists,
  bookCache,
  libraryCards,
  libraries,
  eq,
  and,
  desc,
  count,
} from '@nearbook/db'
import { AddWishlistDto, UpdateWishlistDto } from './dto'
import { lockUser } from '../../common/lock-user'
import { JeongbonaruService } from '../jeongbonaru/jeongbonaru.service'
import { holdingFailure, holdingSummary, unknownHolding } from '../libraries/holding-observation'

@Injectable()
export class WishlistsService {
  constructor(private readonly jeongbonaru: JeongbonaruService) {}
  async listByUser(supabaseUserId: string) {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId))
    if (!user) return { data: [], meta: { total: 0, plan: 'free', limit: 10 } }

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
    return db.transaction(async (tx) => {
      const user = await lockUser(tx, supabaseUserId, true, email)
      if (!user) throw new NotFoundException()
      const [existing] = await tx
        .select()
        .from(wishlists)
        .where(and(eq(wishlists.userId, user.id), eq(wishlists.isbn, dto.isbn)))
      // A retry of an already successful add must work even at the unchanged free limit.
      if (existing) return { data: existing }
      const [current] = await tx
        .select({ value: count() })
        .from(wishlists)
        .where(eq(wishlists.userId, user.id))
      if (user.plan === 'free' && Number(current.value) >= 10)
        throw new ForbiddenException('Wishlist limit reached')
      const [row] = await tx
        .insert(wishlists)
        .values({ userId: user.id, isbn: dto.isbn, note: dto.note })
        .returning()
      return { data: row }
    })
  }

  /** Explicit one-book/one-owned-default-library request, never nearby or a bulk fan-out. */
  async getDefaultHolding(supabaseUserId: string, isbn: string, expectedLibraryId: number) {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId))
    if (!user) throw new NotFoundException()
    const assertSelection = async () => {
      const [item] = await db
        .select({ id: wishlists.id })
        .from(wishlists)
        .where(and(eq(wishlists.userId, user.id), eq(wishlists.isbn, isbn)))
      if (!item) throw new NotFoundException('Wishlist item not found')
      const selected = await db
        .select({
          id: libraries.id,
          name: libraries.name,
          homepage: libraries.homepage,
          lat: libraries.lat,
          lng: libraries.lng,
        })
        .from(libraryCards)
        .innerJoin(libraries, eq(libraryCards.libraryId, libraries.id))
        .where(and(eq(libraryCards.userId, user.id), eq(libraryCards.isDefault, true)))
      if (selected.length !== 1 || selected[0].id !== expectedLibraryId)
        throw new ConflictException('Default library changed or missing')
      return selected[0]
    }
    const library = await assertSelection()
    let observation
    try {
      const result = await this.jeongbonaru.getBookOwnership(isbn, String(library.id))
      observation = result?.availability ?? unknownHolding('invalid-response')
    } catch (error) {
      observation = holdingFailure(error)
    }
    await assertSelection()
    const rows = [{ ...library, ...observation }]
    return { libraries: rows, holdings: holdingSummary(rows, 1) }
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
    await db.transaction(async (tx) => {
      const user = await lockUser(tx, supabaseUserId)
      if (!user) return
      await tx.delete(wishlists).where(and(eq(wishlists.userId, user.id), eq(wishlists.isbn, isbn)))
    })
  }
}
