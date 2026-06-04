import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac } from 'crypto'
import {
  and,
  db,
  eq,
  libraries,
  libraryCards,
  notificationPreferences,
  pushSubscriptions,
  sql,
  users,
} from '@nearbook/db'
import { AuthService } from '../../auth/services/auth.service'
import { UpdatePrefDto } from '../dto/update-pref.dto'

export type NotificationAdminHealth = {
  totalUsers: number
  activeStatus: number
  bouncedStatus: number
  complainedStatus: number
  softFailingStatus: number
  last7DaysDeliveryRate: number
  last7DaysComplaintRate: number
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  async getPref(supabaseUserId: string) {
    const user = await this.authService.getOrCreateUser(supabaseUserId)
    const pref = await this.ensurePreference(user.id)

    return {
      data: {
        emailOnAvailable: pref.emailOnAvailable,
        email: user.email,
        emailStatus: pref.emailStatus,
        softBounceCount: pref.softBounceCount,
        digestFrequency: pref.digestFrequency,
        weeklyDigestDayOfWeek: pref.weeklyDigestDayOfWeek,
        lastBounceAt: pref.lastBounceAt,
        lastBounceReason: pref.lastBounceReason,
      },
    }
  }

  async updatePref(supabaseUserId: string, dto: UpdatePrefDto) {
    const user = await this.authService.getOrCreateUser(supabaseUserId)
    await this.ensurePreference(user.id)

    const [row] = await db
      .update(notificationPreferences)
      .set({
        ...(dto.emailOnAvailable !== undefined && { emailOnAvailable: dto.emailOnAvailable }),
        ...(dto.digestFrequency !== undefined && { digestFrequency: dto.digestFrequency }),
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.userId, user.id))
      .returning()

    return {
      data: {
        emailOnAvailable: row.emailOnAvailable,
        emailStatus: row.emailStatus,
        softBounceCount: row.softBounceCount,
        digestFrequency: row.digestFrequency,
        updatedAt: row.updatedAt,
      },
    }
  }

  async reactivate(supabaseUserId: string) {
    const user = await this.authService.getOrCreateUser(supabaseUserId)
    await this.ensurePreference(user.id)

    const [row] = await db
      .update(notificationPreferences)
      .set({
        emailOnAvailable: true,
        emailStatus: 'active',
        softBounceCount: 0,
        lastBounceReason: null,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.userId, user.id))
      .returning()

    return {
      data: {
        emailOnAvailable: row.emailOnAvailable,
        emailStatus: row.emailStatus,
        softBounceCount: row.softBounceCount,
      },
    }
  }

  async getPushStatus(supabaseUserId: string) {
    const user = await this.authService.getOrCreateUser(supabaseUserId)
    const rows = await db
      .select({
        id: pushSubscriptions.id,
        endpoint: pushSubscriptions.endpoint,
        lastUsedAt: pushSubscriptions.lastUsedAt,
      })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, user.id))

    return {
      data: {
        enabled: rows.length > 0,
        subscriptions: rows,
      },
    }
  }

  async upsertPushSubscription(supabaseUserId: string, body: any, userAgent?: string) {
    const endpoint = body?.endpoint
    const p256dh = body?.keys?.p256dh
    const auth = body?.keys?.auth

    if (!endpoint || !p256dh || !auth) {
      throw new BadRequestException('invalid push subscription')
    }

    const user = await this.authService.getOrCreateUser(supabaseUserId)

    const [row] = await db
      .insert(pushSubscriptions)
      .values({
        userId: user.id,
        endpoint,
        p256dh,
        auth,
        userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 256) : null,
        lastUsedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: user.id,
          p256dh,
          auth,
          userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 256) : null,
          lastUsedAt: new Date(),
        },
      })
      .returning({
        id: pushSubscriptions.id,
        endpoint: pushSubscriptions.endpoint,
      })

    return {
      data: {
        enabled: true,
        subscription: row,
      },
    }
  }

  async deletePushSubscription(supabaseUserId: string, endpoint?: string) {
    const user = await this.authService.getOrCreateUser(supabaseUserId)

    if (endpoint?.trim()) {
      await db
        .delete(pushSubscriptions)
        .where(and(
          eq(pushSubscriptions.userId, user.id),
          eq(pushSubscriptions.endpoint, endpoint.trim()),
        ))
    } else {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id))
    }

    return {
      data: {
        enabled: false,
      },
    }
  }

  async unsubscribeByToken(token: string) {
    if (!token?.trim()) {
      throw new BadRequestException('token is required')
    }

    const [row] = await db
      .update(notificationPreferences)
      .set({
        emailOnAvailable: false,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.unsubscribeToken, token.trim()))
      .returning({ userId: notificationPreferences.userId })

    if (!row) {
      throw new NotFoundException('invalid unsubscribe token')
    }

    return { message: '알림이 꺼졌어요' }
  }

  async downgradeToWeekly(token: string) {
    if (!token?.trim()) {
      throw new BadRequestException('token is required')
    }

    const [row] = await db
      .update(notificationPreferences)
      .set({
        digestFrequency: 'weekly',
        weeklyDigestDayOfWeek: 1,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.unsubscribeToken, token.trim()))
      .returning({ userId: notificationPreferences.userId })

    if (!row) {
      throw new NotFoundException('invalid token')
    }

    return { message: '이제 주 1회 월요일에 보내드릴게요' }
  }

  async authorizeManualRun(secret: string | undefined) {
    const expected = this.config.get<string>('WISHLIST_DIGEST_CRON_SECRET')
    if (!expected || secret !== expected) {
      throw new ForbiddenException()
    }
  }

  async getHealth(): Promise<NotificationAdminHealth> {
    const result = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE email_status = 'active')::int AS active_status,
        COUNT(*) FILTER (WHERE email_status = 'bounced')::int AS bounced_status,
        COUNT(*) FILTER (WHERE email_status = 'complained')::int AS complained_status,
        COUNT(*) FILTER (WHERE email_status = 'soft_failing')::int AS soft_failing_status
      FROM nearbook.notification_preferences
    `)

    const stats = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE type = 'wishlist_available' AND status = 'sent')::int AS sent_count,
        COUNT(*) FILTER (WHERE delivery_status = 'delivered')::int AS delivered_count,
        COUNT(*) FILTER (WHERE delivery_status = 'complained')::int AS complained_count
      FROM nearbook.notification_logs
      WHERE sent_at >= now() - interval '7 days'
    `)

    const sentCount = Number((stats as any)[0]?.sent_count ?? 0)
    const deliveredCount = Number((stats as any)[0]?.delivered_count ?? 0)
    const complainedCount = Number((stats as any)[0]?.complained_count ?? 0)

    return {
      totalUsers: Number((result as any)[0]?.total_users ?? 0),
      activeStatus: Number((result as any)[0]?.active_status ?? 0),
      bouncedStatus: Number((result as any)[0]?.bounced_status ?? 0),
      complainedStatus: Number((result as any)[0]?.complained_status ?? 0),
      softFailingStatus: Number((result as any)[0]?.soft_failing_status ?? 0),
      last7DaysDeliveryRate: sentCount > 0 ? deliveredCount / sentCount : 0,
      last7DaysComplaintRate: sentCount > 0 ? complainedCount / sentCount : 0,
    }
  }

  async getDefaultLibraryForUser(userId: number, region: string | null) {
    const [defaultCard] = await db
      .select({
        libraryId: libraryCards.libraryId,
        libraryName: libraries.name,
      })
      .from(libraryCards)
      .innerJoin(libraries, eq(libraryCards.libraryId, libraries.id))
      .where(and(eq(libraryCards.userId, userId), eq(libraryCards.isDefault, true)))
      .limit(1)

    if (defaultCard) return defaultCard

    const [firstCard] = await db
      .select({
        libraryId: libraryCards.libraryId,
        libraryName: libraries.name,
      })
      .from(libraryCards)
      .innerJoin(libraries, eq(libraryCards.libraryId, libraries.id))
      .where(eq(libraryCards.userId, userId))
      .limit(1)

    if (firstCard) return firstCard

    if (!region) return null

    const [regionalLibrary] = await db
      .select({
        libraryId: libraries.id,
        libraryName: libraries.name,
      })
      .from(libraries)
      .where(eq(libraries.region, region))
      .limit(1)

    return regionalLibrary ?? null
  }

  private async ensurePreference(userId: number) {
    const existing = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    })
    if (existing) return existing

    const [created] = await db
      .insert(notificationPreferences)
      .values({
        userId,
        unsubscribeToken: this.buildFallbackToken(userId),
        digestFrequency: 'daily',
        weeklyDigestDayOfWeek: 1,
      })
      .onConflictDoNothing()
      .returning()

    if (created) return created

    const loaded = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    })
    if (!loaded) {
      throw new NotFoundException('notification preference not found')
    }

    return loaded
  }

  private buildFallbackToken(userId: number) {
    const secret = this.config.get<string>('UNSUBSCRIBE_SECRET') ?? 'nearbook-dev-unsubscribe-secret'
    return createHmac('sha256', secret)
      .update(`notification:${userId}`)
      .digest('hex')
      .slice(0, 64)
  }
}
