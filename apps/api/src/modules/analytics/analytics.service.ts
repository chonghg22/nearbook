import { Injectable } from '@nestjs/common'
import { db, eq, events, users } from '@nearbook/db'
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto'

const MAX_PAYLOAD_BYTES = 16 * 1024

function truncatePayload(payload: Record<string, unknown>) {
  const serialized = JSON.stringify(payload)
  if (serialized.length <= MAX_PAYLOAD_BYTES) return payload

  return {
    truncated: true,
    originalBytes: serialized.length,
  }
}

@Injectable()
export class AnalyticsService {
  async create(args: {
    dto: CreateAnalyticsEventDto
    supabaseUserId: string | null
    referrer?: string
  }) {
    const userId = args.supabaseUserId
      ? await this.findUserId(args.supabaseUserId)
      : null

    const payload = truncatePayload({
      ...(args.dto.payload ?? {}),
      pathname: args.dto.pathname,
      search: args.dto.search,
      at: args.dto.at,
      referrer: args.referrer,
    })

    await db.insert(events).values({
      userId,
      type: args.dto.type,
      payload,
      sessionId: args.dto.sessionId ?? null,
    })

    return { ok: true }
  }

  private async findUserId(supabaseUserId: string) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.supabaseUserId, supabaseUserId))
      .limit(1)

    return user?.id ?? null
  }
}
