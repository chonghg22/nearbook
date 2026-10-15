import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { db, apiUsage, eq, sql } from '@nearbook/db'
import { QuotaAccountingUnavailableError, QuotaBlockedError } from './quota.errors'
import { Priority, quotaMode, quotaPolicy } from './quota-policy'
export type { Priority, QuotaMode } from './quota-policy'

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name)
  private snapshot: Record<string, unknown> | null = null
  constructor(private readonly config: ConfigService) {
    if (quotaPolicy(config).limitClamped)
      this.logger.warn('Configured provider budget exceeds verified account limit; capped at 500')
  }

  /** Durable reservation before dispatch. No HTTP or notifications under the lock. */
  async acquire(provider: 'jeongbonaru', priority: Priority, endpoint: string): Promise<number> {
    const policy = quotaPolicy(this.config)
    const budget = priority === 'LOW' ? policy.lowPriorityLimit : policy.limit
    try {
      return await db.transaction(
        async (tx) => {
          await tx.execute(sql`
          SELECT set_config('lock_timeout', '1500ms', true),
                 set_config('statement_timeout', '2500ms', true)
        `)
          // Separate statement after the lock: fresh READ COMMITTED snapshot.
          await tx.execute(sql`SELECT pg_advisory_xact_lock(73291012)`)
          const rows = await tx.execute(sql`
          WITH usage AS (
            SELECT count(*)::int AS called
            FROM nearbook.api_usage
            WHERE provider = ${provider} AND cached_hit = false
              AND created_at >= (date_trunc('day', statement_timestamp() AT TIME ZONE 'Asia/Seoul') - interval '9 hours')
              AND created_at < (date_trunc('day', statement_timestamp() AT TIME ZONE 'Asia/Seoul') + interval '15 hours')
          ), reservation AS (
            INSERT INTO nearbook.api_usage (provider, endpoint, status_code, cached_hit, created_at)
            SELECT ${provider}, ${endpoint}, 0, false, statement_timestamp() AT TIME ZONE 'UTC'
            FROM usage WHERE called < ${budget}
            RETURNING id
          )
          SELECT usage.called, reservation.id FROM usage LEFT JOIN reservation ON true
        `)
          const row = rows[0] as { called?: unknown; id?: unknown } | undefined
          const called = Number(row?.called)
          if (!row || !Number.isSafeInteger(called) || called < 0)
            throw new QuotaAccountingUnavailableError()
          if (row.id === null || row.id === undefined) {
            throw new QuotaBlockedError(
              called >= policy.limit ? 'QUOTA_BLOCKED_ALL' : 'QUOTA_BLOCKED_LOW'
            )
          }
          const id = Number(row.id)
          if (!Number.isSafeInteger(id) || id <= 0) throw new QuotaAccountingUnavailableError()
          return id
        },
        { isolationLevel: 'read committed' }
      )
    } catch (error) {
      if (error instanceof QuotaBlockedError) throw error
      this.logger.error('quota reservation unavailable; provider dispatch blocked')
      throw new QuotaAccountingUnavailableError()
    }
  }

  /** Update the SAME row. A crash/logging failure never refunds reserved budget. */
  async complete(id: number, statusCode: number, durationMs: number): Promise<void> {
    try {
      await db
        .update(apiUsage)
        .set({ statusCode, durationMs: Math.min(2147483647, Math.max(0, durationMs)) })
        .where(eq(apiUsage.id, id))
    } catch {
      this.logger.error('quota completion persistence failed; reservation retained')
    }
  }

  async getStatus() {
    const policy = quotaPolicy(this.config)
    try {
      const rows = await db.execute(sql`
        SELECT count(*)::int AS called,
          count(*) FILTER (WHERE status_code = 200)::int AS succeeded,
          count(*) FILTER (WHERE status_code IS NULL OR status_code = 0)::int AS unresolved,
          to_char(statement_timestamp() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS day_key
        FROM nearbook.api_usage
        WHERE provider = 'jeongbonaru' AND cached_hit = false
          AND created_at >= (date_trunc('day', statement_timestamp() AT TIME ZONE 'Asia/Seoul') - interval '9 hours')
          AND created_at < (date_trunc('day', statement_timestamp() AT TIME ZONE 'Asia/Seoul') + interval '15 hours')
      `)
      const row = rows[0] as {
        called: unknown
        succeeded: unknown
        unresolved: unknown
        day_key: string
      }
      const called = Number(row?.called),
        succeeded = Number(row?.succeeded),
        unresolved = Number(row?.unresolved)
      if (
        ![called, succeeded, unresolved].every((n) => Number.isSafeInteger(n) && n >= 0) ||
        succeeded + unresolved > called ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row?.day_key ?? '')
      ) {
        throw new QuotaAccountingUnavailableError()
      }
      const status = {
        provider: 'jeongbonaru',
        ...policy,
        called,
        succeeded,
        unresolved,
        failed: called - succeeded - unresolved,
        remaining: Math.max(0, policy.limit - called),
        percentage: Number(((called / policy.limit) * 100).toFixed(1)),
        mode: quotaMode(called, policy.limit),
        dayKey: row.day_key,
        resetAt: new Date(row.day_key + 'T15:00:00.000Z').toISOString(),
        observedAt: new Date().toISOString(),
        source: 'database',
      }
      this.snapshot = status
      return status
    } catch {
      this.logger.error('quota status unavailable')
      throw new QuotaAccountingUnavailableError()
    }
  }

  /** Cheap liveness: never invent zero usage after restart/day rollover. */
  getLocalStatus() {
    const dayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
    if (this.snapshot?.dayKey === dayKey)
      return {
        ...this.snapshot,
        stale: Date.now() - Date.parse(String(this.snapshot.observedAt)) > 90000,
        source: 'last-database-observation',
      }
    return {
      provider: 'jeongbonaru',
      ...quotaPolicy(this.config),
      called: null,
      remaining: null,
      mode: 'unknown',
      observedAt: null,
      source: 'not-observed',
    }
  }
}
