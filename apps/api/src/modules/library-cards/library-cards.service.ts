import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { db, users, libraryCards, libraries, eq, and, asc } from '@nearbook/db'
import { AddLibraryCardDto, UpdateLibraryCardDto } from './dto'
import { lockUser } from '../../common/lock-user'

@Injectable()
export class LibraryCardsService {
  async listByUser(supabaseUserId: string) {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId))
    if (!user) return { data: [], meta: { total: 0, plan: 'free', limit: 1 } }

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
      .orderBy(asc(libraryCards.id))

    return {
      data: items,
      meta: { total: items.length, plan: user.plan, limit: user.plan === 'free' ? 1 : null },
    }
  }

  async add(supabaseUserId: string, dto: AddLibraryCardDto) {
    return db.transaction(async (tx) => {
      const user = await lockUser(tx, supabaseUserId, true)
      if (!user) throw new NotFoundException()
      const existing = await tx.select().from(libraryCards).where(eq(libraryCards.userId, user.id))
      const duplicate = existing.find((card) => card.libraryId === dto.libraryId)
      if (duplicate) return { data: duplicate }
      if (user.plan === 'free' && existing.length >= 1)
        throw new ForbiddenException('Library limit reached')
      const [library] = await tx
        .select({ id: libraries.id })
        .from(libraries)
        .where(eq(libraries.id, dto.libraryId))
      if (!library) throw new NotFoundException('Library not found')
      const [row] = await tx
        .insert(libraryCards)
        .values({
          userId: user.id,
          libraryId: dto.libraryId,
          nickname: dto.nickname,
          isDefault: existing.length === 0,
        })
        .returning()
      return { data: row }
    })
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
    if (dto.isDefault !== undefined && typeof dto.isDefault !== 'boolean')
      throw new BadRequestException()
    return db.transaction(async (tx) => {
      const user = await lockUser(tx, supabaseUserId)
      if (!user) throw new NotFoundException()
      const condition = and(eq(libraryCards.id, cardId), eq(libraryCards.userId, user.id))
      const [target] = await tx.select().from(libraryCards).where(condition)
      // Validate ownership BEFORE clearing defaults, all inside the same transaction.
      if (!target) throw new NotFoundException()
      if (dto.nickname === undefined && dto.isDefault === undefined) return { data: target }
      if (dto.isDefault)
        await tx
          .update(libraryCards)
          .set({ isDefault: false })
          .where(eq(libraryCards.userId, user.id))
      const [row] = await tx
        .update(libraryCards)
        .set({
          ...(dto.nickname !== undefined && { nickname: dto.nickname }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        })
        .where(condition)
        .returning()
      if (!row) throw new NotFoundException()
      return { data: row }
    })
  }

  async remove(supabaseUserId: string, cardId: number) {
    await db.transaction(async (tx) => {
      const user = await lockUser(tx, supabaseUserId)
      if (!user) return
      await tx
        .delete(libraryCards)
        .where(and(eq(libraryCards.id, cardId), eq(libraryCards.userId, user.id)))
      // Do not auto-promote another card: the user chooses a new default.
    })
  }

  async removeByLibraryId(supabaseUserId: string, libraryId: number) {
    await db.transaction(async (tx) => {
      const user = await lockUser(tx, supabaseUserId)
      if (!user) return
      await tx
        .delete(libraryCards)
        .where(and(eq(libraryCards.libraryId, libraryId), eq(libraryCards.userId, user.id)))
    })
  }
}
