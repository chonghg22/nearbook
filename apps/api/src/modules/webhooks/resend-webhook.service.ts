import { Injectable, Logger } from '@nestjs/common'
import {
  db,
  eq,
  notificationLogs,
  notificationPreferences,
  sql,
  users,
} from '@nearbook/db'
import { NotifyService } from '../notify/notify.service'

export type ResendWebhookEvent = {
  type: 'email.delivered' | 'email.bounced' | 'email.complained' | 'email.delivery_delayed'
  created_at?: string
  data: {
    email_id: string
    to?: string[]
    bounce?: {
      type?: string
      message?: string
      subType?: string
    }
  }
}

@Injectable()
export class ResendWebhookService {
  private readonly logger = new Logger(ResendWebhookService.name)

  constructor(private readonly notify: NotifyService) {}

  async handleEvent(event: ResendWebhookEvent) {
    const email = event.data.to?.[0]?.trim().toLowerCase()

    await db
      .update(notificationLogs)
      .set({
        deliveryStatus: this.mapDeliveryStatus(event.type),
        deliveryUpdatedAt: new Date(),
      })
      .where(eq(notificationLogs.resendMessageId, event.data.email_id))

    if (!email) return

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) return

    switch (event.type) {
      case 'email.bounced':
        await this.handleBounce(user.id, email, event)
        break
      case 'email.complained':
        await db
          .update(notificationPreferences)
          .set({
            emailStatus: 'complained',
            emailOnAvailable: false,
            lastBounceAt: new Date(),
            lastBounceReason: 'user reported as spam',
            updatedAt: new Date(),
          })
          .where(eq(notificationPreferences.userId, user.id))

        this.logger.error(`Complaint -> disabled notifications for user ${user.id} (${email})`)
        await this.notify.sendDiscord({
          level: 'critical',
          title: 'Resend complaint 수신',
          description: `user=${user.id}, email=${email}`,
        })
        await this.notifyIfComplaintRateHigh()
        break
      case 'email.delivered':
        await db
          .update(notificationPreferences)
          .set({
            softBounceCount: 0,
            updatedAt: new Date(),
          })
          .where(eq(notificationPreferences.userId, user.id))
        break
      case 'email.delivery_delayed':
        this.logger.warn(`Delivery delayed for user ${user.id} (${email})`)
        break
    }
  }

  private async handleBounce(userId: number, email: string, event: ResendWebhookEvent) {
    const reason = event.data.bounce?.message ?? 'bounce'
    const bounceType = (event.data.bounce?.type ?? '').toLowerCase()
    const isHard = bounceType.includes('hard') || bounceType.includes('permanent')

    if (isHard) {
      await db
        .update(notificationPreferences)
        .set({
          emailStatus: 'bounced',
          emailOnAvailable: false,
          lastBounceAt: new Date(),
          lastBounceReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userId, userId))

      this.logger.warn(`Hard bounce -> disabled notifications for user ${userId} (${email})`)
      return
    }

    const [updated] = await db
      .update(notificationPreferences)
      .set({
        softBounceCount: sql`${notificationPreferences.softBounceCount} + 1`,
        lastBounceAt: new Date(),
        lastBounceReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.userId, userId))
      .returning({
        softBounceCount: notificationPreferences.softBounceCount,
      })

    if ((updated?.softBounceCount ?? 0) >= 3) {
      await db
        .update(notificationPreferences)
        .set({
          emailStatus: 'soft_failing',
          emailOnAvailable: false,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userId, userId))

      this.logger.warn(`Soft bounce x3 -> disabled notifications for user ${userId} (${email})`)
    }
  }

  private mapDeliveryStatus(type: ResendWebhookEvent['type']) {
    switch (type) {
      case 'email.delivered':
        return 'delivered'
      case 'email.bounced':
        return 'bounced'
      case 'email.complained':
        return 'complained'
      case 'email.delivery_delayed':
        return 'delayed'
    }
  }

  private async notifyIfComplaintRateHigh() {
    const result = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE type = 'wishlist_available' AND status = 'sent')::int AS sent_count,
        COUNT(*) FILTER (WHERE delivery_status = 'complained')::int AS complained_count
      FROM nearbook.notification_logs
      WHERE sent_at >= now() - interval '7 days'
    `)

    const sentCount = Number((result as any)[0]?.sent_count ?? 0)
    const complainedCount = Number((result as any)[0]?.complained_count ?? 0)
    const rate = sentCount > 0 ? complainedCount / sentCount : 0

    if (sentCount > 0 && rate > 0.001) {
      await this.notify.sendDiscord({
        level: 'critical',
        title: 'Complaint rate 임계치 초과',
        description: `최근 7일 complaint rate=${(rate * 100).toFixed(3)}%`,
        cooldownKey: 'resend-complaint-rate-high',
        cooldownMs: 30 * 60 * 1000,
      })
    }
  }
}
