import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { db, users, libraryCards, eq } from '@nearbook/db'

export interface AuthenticatedUser {
  supabaseUserId: string
  email?: string
}

export interface PersonalizeContext {
  applied: boolean
  reason: 'disabled' | 'anonymous' | 'sort_override' | 'no_library_cards' | 'no_match' | 'applied'
  userId: number | null
  myLibraryIds: number[]
}

const BOOST_FACTOR = 0.30

@Injectable()
export class SearchPersonalizeService {
  private readonly logger = new Logger(SearchPersonalizeService.name)

  constructor(private config: ConfigService) {}

  async loadContext(
    user: AuthenticatedUser | null,
    sort: string | undefined,
    personalizeFlag: boolean | undefined,
  ): Promise<PersonalizeContext> {
    const enabled = this.config.get<string>('SEARCH_PERSONALIZE_ENABLED') === 'true'
    if (!enabled) {
      return { applied: false, reason: 'disabled', userId: null, myLibraryIds: [] }
    }
    if (!user) {
      return { applied: false, reason: 'anonymous', userId: null, myLibraryIds: [] }
    }
    if (personalizeFlag === false) {
      return { applied: false, reason: 'sort_override', userId: null, myLibraryIds: [] }
    }
    if (sort && sort !== 'relevance') {
      return { applied: false, reason: 'sort_override', userId: null, myLibraryIds: [] }
    }

    try {
      const cards = await db
        .select({ libraryId: libraryCards.libraryId, userId: users.id })
        .from(libraryCards)
        .innerJoin(users, eq(users.id, libraryCards.userId))
        .where(eq(users.supabaseUserId, user.supabaseUserId))

      if (cards.length === 0) {
        return { applied: false, reason: 'no_library_cards', userId: null, myLibraryIds: [] }
      }

      return {
        applied: true,
        reason: 'applied',
        userId: cards[0].userId,
        myLibraryIds: cards.map((c) => c.libraryId),
      }
    } catch (err) {
      this.logger.warn('Failed to load personalize context', (err as Error).message)
      return { applied: false, reason: 'disabled', userId: null, myLibraryIds: [] }
    }
  }

  rerank<T extends { score: number; matchedLibraryIds?: number[] }>(
    items: T[],
    context: PersonalizeContext,
  ): { items: T[]; context: PersonalizeContext } {
    if (!context.applied) return { items, context }

    const myLibSet = new Set(context.myLibraryIds)
    let matchCount = 0

    const boosted = items.map((it) => {
      const hasMatch = (it.matchedLibraryIds ?? []).some((id) => myLibSet.has(id))
      if (hasMatch) matchCount++
      const finalScore = hasMatch ? it.score * (1 + BOOST_FACTOR) : it.score
      return { ...it, score: finalScore }
    })

    boosted.sort((a, b) => b.score - a.score)

    const finalContext: PersonalizeContext =
      matchCount === 0
        ? { ...context, applied: false, reason: 'no_match' }
        : context

    return { items: boosted, context: finalContext }
  }
}
