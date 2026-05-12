import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import {
  and,
  db,
  eq,
  notificationLogs,
  notificationPreferences,
  sql,
  users,
  wishlists,
  bookCache,
} from '@nearbook/db'
import { NotifyService } from '../notify/notify.service'
import { JeongbonaruService } from '../jeongbonaru/jeongbonaru.service'
import { NotificationsService } from './notifications.service'
import { ResendClient } from './resend.client'
import { renderWishlistDigestEmail, WishlistDigestHit } from './templates/wishlist-digest'
import { PushService } from './push.service'

interface Candidate extends WishlistDigestHit {
  userId: number
  email: string
  nickname: string | null
  unsubscribeToken: string
  libraryId: number
  digestFrequency: 'daily' | 'weekly'
}

@Injectable()
export class WishlistDigestCron {
  private readonly logger = new Logger(WishlistDigestCron.name)
  private readonly maxCandidates = 300

  constructor(
    private readonly jeongbonaru: JeongbonaruService,
    private readonly notificationsService: NotificationsService,
    private readonly resend: ResendClient,
    private readonly notify: NotifyService,
    private readonly pushService: PushService,
  ) {}

  @Cron('0 4 * * *', { timeZone: 'Asia/Seoul' })
  async runScheduled() {
    await this.run('scheduled')
  }

  async run(source: 'scheduled' | 'manual' = 'manual') {
    const used = await this.getTodayCallCount()
    if (used >= 400) {
      this.logger.warn(`wishlist digest skipped: jeongbonaru quota ${used}/500`)
      await this.notify.sendDiscord({
        level: 'warn',
        title: '위시 알림 cron 중단',
        description: `정보나루 호출량이 ${used}/500 에 도달해 일괄 발송을 건너뜁니다.`,
        cooldownKey: 'wishlist-digest-quota-skip',
        cooldownMs: 60 * 60 * 1000,
      })
      return { ok: true, skipped: true, reason: 'quota', used }
    }

    const now = new Date()
    const kstDayOfWeek = Number(
      new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', weekday: 'short' })
        .format(now)
        .replace('Sun', '0')
        .replace('Mon', '1')
        .replace('Tue', '2')
        .replace('Wed', '3')
        .replace('Thu', '4')
        .replace('Fri', '5')
        .replace('Sat', '6'),
    )

    const daily = await this.runForFrequency('daily', { lookbackDays: 1 })
    const weekly = await this.runForFrequency('weekly', { lookbackDays: 7, onlyDow: kstDayOfWeek })

    return {
      ok: true,
      skipped: false,
      daily,
      weekly,
      source,
    }
  }

  private async runForFrequency(
    frequency: 'daily' | 'weekly',
    opts: { lookbackDays: number; onlyDow?: number },
  ) {
    const candidates = await this.collectCandidates(frequency, opts)
    const grouped = this.groupByUser(candidates)
    let sentUsers = 0
    let failedUsers = 0

    for (const [userId, hits] of grouped.entries()) {
      const first = hits[0]
      if (!first) continue

      const unsubscribeUrl = this.makeUnsubscribeUrl(first.unsubscribeToken)
      const downgradeUrl = this.makeDowngradeUrl(first.unsubscribeToken)
      const { subject, html, text } = renderWishlistDigestEmail({
        nickname: first.nickname ?? '독자님',
        hits,
        unsubscribeUrl,
        downgradeUrl,
        tone: frequency,
        periodDays: opts.lookbackDays,
      })

      const result = await this.resend.send({
        to: first.email,
        subject,
        html,
        text,
        tag: `wishlist_${frequency}`,
        unsubscribeUrl,
      })

      await this.pushService.sendToUser(userId, {
        title: hits.length > 1 ? `위시한 책 ${hits.length}권이 대출 가능해졌어요` : '위시한 책이 대출 가능해졌어요',
        body: hits.length > 1
          ? `${first.title} 외 ${hits.length - 1}권을 확인해 보세요.`
          : `${first.title}을(를) 지금 확인해 보세요.`,
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'https://www.near-book.com'}/me/wishlist?source=push`,
      })

      await db.insert(notificationLogs).values(
        hits.map((hit) => ({
          userId,
          type: 'wishlist_available',
          isbn: hit.isbn,
          libraryId: hit.libraryId,
          resendMessageId: result.messageId,
          status: result.ok ? 'sent' : 'failed',
          deliveryStatus: result.ok ? 'queued' : 'bounced',
          deliveryUpdatedAt: new Date(),
        })),
      )

      if (result.ok) {
        sentUsers += 1
        await db
          .update(notificationPreferences)
          .set({
            lastDigestSentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(notificationPreferences.userId, userId))
      } else {
        failedUsers += 1
      }
    }

    this.logger.log(`wishlist digest ${frequency}: users=${grouped.size}, hits=${candidates.length}, sent=${sentUsers}, failed=${failedUsers}`)

    return { users: grouped.size, hits: candidates.length, sentUsers, failedUsers }
  }

  private async collectCandidates(
    frequency: 'daily' | 'weekly',
    opts: { lookbackDays: number; onlyDow?: number },
  ) {
    if (frequency === 'weekly' && opts.onlyDow !== 1) {
      return []
    }

    const eligibleUsers = await db
      .select({
        userId: users.id,
        email: users.email,
        nickname: users.nickname,
        region: users.region,
        unsubscribeToken: notificationPreferences.unsubscribeToken,
        digestFrequency: notificationPreferences.digestFrequency,
      })
      .from(users)
      .innerJoin(notificationPreferences, eq(notificationPreferences.userId, users.id))
      .where(and(
        eq(notificationPreferences.emailOnAvailable, true),
        eq(notificationPreferences.emailStatus, 'active'),
        eq(notificationPreferences.digestFrequency, frequency),
        sql`${users.email} IS NOT NULL`,
        ...(frequency === 'weekly'
          ? [eq(notificationPreferences.weeklyDigestDayOfWeek, 1)]
          : []),
      ))

    const hits: Candidate[] = []
    const reNotifyWindowDays = frequency === 'weekly' ? 14 : 7

    for (const user of eligibleUsers) {
      if (hits.length >= this.maxCandidates) break
      if (!user.email) continue

      const library = await this.notificationsService.getDefaultLibraryForUser(user.userId, user.region)
      if (!library) continue

      const wishlistItems = await db
        .select({
          isbn: wishlists.isbn,
          title: bookCache.title,
          author: bookCache.author,
          coverUrl: bookCache.coverUrl,
        })
        .from(wishlists)
        .leftJoin(bookCache, eq(wishlists.isbn, bookCache.isbn))
        .where(eq(wishlists.userId, user.userId))

      for (const item of wishlistItems) {
        if (hits.length >= this.maxCandidates) break

        const [recentLog] = await db
          .select({ id: notificationLogs.id })
          .from(notificationLogs)
          .where(and(
            eq(notificationLogs.userId, user.userId),
            eq(notificationLogs.isbn, item.isbn),
            eq(notificationLogs.libraryId, library.libraryId),
            eq(notificationLogs.status, 'sent'),
            sql`${notificationLogs.sentAt} > now() - (${reNotifyWindowDays} || ' days')::interval`,
          ))
          .limit(1)

        if (recentLog) continue

        const available = await this.jeongbonaru.getBookOwnership(item.isbn, library.libraryId)
        const result = (available as any)?.response?.result ?? {}
        if (result.loanAvailable !== 'Y') continue

        hits.push({
          userId: user.userId,
          email: user.email,
          nickname: user.nickname,
          unsubscribeToken: user.unsubscribeToken,
          isbn: item.isbn,
          title: item.title ?? `ISBN ${item.isbn}`,
          author: item.author ?? null,
          coverUrl: item.coverUrl ?? null,
          libraryId: library.libraryId,
          libraryName: library.libraryName,
          digestFrequency: user.digestFrequency as 'daily' | 'weekly',
        })
      }
    }

    return hits
  }

  private async getTodayCallCount() {
    const result = await db.execute(sql`
      SELECT count(*)::int AS count
      FROM nearbook.api_usage
      WHERE provider = 'jeongbonaru'
        AND status_code = 200
        AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
    `)

    return Number((result as any)[0]?.count ?? 0)
  }

  private groupByUser(candidates: Candidate[]) {
    const grouped = new Map<number, Candidate[]>()
    for (const candidate of candidates) {
      const current = grouped.get(candidate.userId)
      if (current) current.push(candidate)
      else grouped.set(candidate.userId, [candidate])
    }
    return grouped
  }

  private makeUnsubscribeUrl(token: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'https://우리동네책.kr'
    return `${appUrl.replace(/\/$/, '')}/unsubscribe?token=${encodeURIComponent(token)}`
  }

  private makeDowngradeUrl(token: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'https://우리동네책.kr'
    return `${appUrl.replace(/\/$/, '')}/digest/downgrade?token=${encodeURIComponent(token)}`
  }
}
