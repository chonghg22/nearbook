import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { db, eq, pushSubscriptions } from '@nearbook/db'
import webpush from 'web-push'

interface PushPayload {
  title: string
  body: string
  url: string
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name)

  constructor(private readonly config: ConfigService) {
    const publicKey = this.config.get<string>('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY')

    if (!publicKey || !privateKey) return

    webpush.setVapidDetails('mailto:notify@near-book.com', publicKey, privateKey)
  }

  isConfigured() {
    return Boolean(
      this.config.get<string>('NEXT_PUBLIC_VAPID_PUBLIC_KEY') &&
      this.config.get<string>('VAPID_PRIVATE_KEY'),
    )
  }

  async sendToUser(userId: number, payload: PushPayload) {
    if (!this.isConfigured()) return { sent: 0, skipped: true as const }

    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId))

    let sent = 0

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload),
        )

        sent += 1

        await db
          .update(pushSubscriptions)
          .set({ lastUsedAt: new Date() })
          .where(eq(pushSubscriptions.id, subscription.id))
      } catch (error: any) {
        const statusCode = Number(error?.statusCode ?? 0)
        if (statusCode === 404 || statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id))
          continue
        }

        this.logger.warn(`push delivery failed: user=${userId} status=${statusCode || 'unknown'}`)
      }
    }

    return { sent, skipped: false as const }
  }
}
