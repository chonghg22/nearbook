import { Injectable } from '@nestjs/common'
import { count, db, desc, eq, feedback, notices, sql, users } from '@nearbook/db'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class AdminDashboardService {
  constructor(private readonly notificationsService: NotificationsService) {}

  async getSummary() {
    const [
      [{ totalUsers }],
      [{ totalNotices }],
      [{ totalFeedback }],
      feedbackByStatus,
      recentFeedback,
      notificationHealth,
      apiUsageRows,
    ] = await Promise.all([
      db.select({ totalUsers: count() }).from(users),
      db.select({ totalNotices: count() }).from(notices),
      db.select({ totalFeedback: count() }).from(feedback),
      db.execute(sql`
        select status, count(*)::int as count
        from nearbook.feedback
        group by status
        order by status asc
      `),
      db
        .select({
          id: feedback.id,
          category: feedback.category,
          title: feedback.title,
          status: feedback.status,
          contactEmail: feedback.contactEmail,
          createdAt: feedback.createdAt,
        })
        .from(feedback)
        .orderBy(desc(feedback.createdAt))
        .limit(5),
      this.notificationsService.getHealth(),
      db.execute(sql`
        select
          provider,
          count(*)::int as total,
          count(*) filter (where cached_hit = true)::int as cached_hits,
          avg(duration_ms)::float8 as avg_duration_ms
        from nearbook.api_usage
        where created_at >= now() - interval '7 days'
        group by provider
        order by total desc
      `),
    ])

    return {
      data: {
        totals: {
          users: totalUsers,
          notices: totalNotices,
          feedback: totalFeedback,
        },
        feedbackByStatus: feedbackByStatus.map((row) => ({
          status: String(row.status),
          count: Number(row.count),
        })),
        recentFeedback,
        notifications: notificationHealth,
        apiUsage: apiUsageRows.map((row) => ({
          provider: String(row.provider),
          total: Number(row.total),
          cachedHits: Number(row.cached_hits),
          avgDurationMs: Number(row.avg_duration_ms ?? 0),
        })),
      },
    }
  }
}
