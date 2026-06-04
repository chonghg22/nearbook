import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import {
  db,
  users,
  libraryCards,
  libraries,
  eq,
  and,
  count,
} from '@nearbook/db'
import { AddLibraryCardDto, UpdateLibraryCardDto } from '../dto'

@Injectable()
export class LibraryCardsService {
  async listByUser(supabaseUserId: string) {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId))
    if (!user) return { data: [] }

    const items = await db
      .select({
        id: libraryCards.id,
        libraryId: libraryCards.libraryId,
        nickname: libraryCards.nickname,
        isDefault: libraryCards.isDefault,
        createdAt: libraryCards.createdAt,
        library: {
          name: libraries.name,
          address: libraries.address,
          lat: libraries.lat,
          lng: libraries.lng,
          homepage: libraries.homepage,
          phone: libraries.phone,
        },
      })
      .from(libraryCards)
      .innerJoin(libraries, eq(libraryCards.libraryId, libraries.id))
      .where(eq(libraryCards.userId, user.id))

    return {
      data: items,
      meta: { total: items.length, plan: user.plan, limit: user.plan === 'free' ? 1 : null },
    }
  }

  async add(supabaseUserId: string, dto: AddLibraryCardDto) {
    const user = await this.getOrCreateUser(supabaseUserId)

    const [countResult] = await db
      .select({ value: count() })
      .from(libraryCards)
      .where(eq(libraryCards.userId, user.id))

    const currentCount = Number(countResult.value)

    if (user.plan === 'free' && currentCount >= 1) {
      throw new ForbiddenException('Pro plan required: only 1 library allowed on free plan')
    }

    const isFirstCard = currentCount === 0

    const [row] = await db
      .insert(libraryCards)
      .values({
        userId: user.id,
        libraryId: dto.libraryId,
        nickname: dto.nickname,
        isDefault: isFirstCard,
      })
      .onConflictDoNothing()
      .returning()

    return { data: row }
  }

  async getStatus(supabaseUserId: string, libraryId: number) {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId))
    if (!user) return { data: { added: false } }

    const [item] = await db
      .select({
        id: libraryCards.id,
        isDefault: libraryCards.isDefault,
        nickname: libraryCards.nickname,
      })
      .from(libraryCards)
      .where(and(eq(libraryCards.userId, user.id), eq(libraryCards.libraryId, libraryId)))
      .limit(1)

    return {
      data: {
        added: Boolean(item),
        id: item?.id ?? null,
        isDefault: item?.isDefault ?? false,
        nickname: item?.nickname ?? null,
      },
    }
  }

  async update(supabaseUserId: string, cardId: number, dto: UpdateLibraryCardDto) {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId))
    if (!user) throw new NotFoundException()

    // isDefault 설정 시 기존 default 해제
    if (dto.isDefault) {
      await db
        .update(libraryCards)
        .set({ isDefault: false })
        .where(eq(libraryCards.userId, user.id))
    }

    const [row] = await db
      .update(libraryCards)
      .set({
        nickname: dto.nickname,
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      })
      .where(and(eq(libraryCards.id, cardId), eq(libraryCards.userId, user.id)))
      .returning()

    return { data: row }
  }

  async remove(supabaseUserId: string, cardId: number) {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId))
    if (!user) return

    await db
      .delete(libraryCards)
      .where(and(eq(libraryCards.id, cardId), eq(libraryCards.userId, user.id)))
  }

  async removeByLibraryId(supabaseUserId: string, libraryId: number) {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId))
    if (!user) return

    await db
      .delete(libraryCards)
      .where(and(eq(libraryCards.libraryId, libraryId), eq(libraryCards.userId, user.id)))
  }

  private async getOrCreateUser(supabaseUserId: string) {
    let user = await db.query.users.findFirst({
      where: eq(users.supabaseUserId, supabaseUserId),
    })

    if (!user) {
      const [created] = await db
        .insert(users)
        .values({
          supabaseUserId,
          email: null,
          nickname: null,
        })
        .returning()

      user = created
    }
    return user
  }
}
