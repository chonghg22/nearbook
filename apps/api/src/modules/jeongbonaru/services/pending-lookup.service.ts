import { Injectable, Logger, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { db, pendingLookups, eq, isNull, sql, asc, desc, lt, and } from '@nearbook/db'
import { LookupType } from '../utils/dedupe-key.util'
import { NotifyService } from '../../notify/services/notify.service'

export interface EnqueueOptions {
  lookupType: LookupType
  dedupeKey: string
  payload: Record<string, any>
  priority?: 'HIGH' | 'LOW'
}

@Injectable()
export class PendingLookupService {
  private readonly logger = new Logger(PendingLookupService.name)
  private readonly maxRetry: number

  constructor(
    private readonly config: ConfigService,
    private readonly notify: NotifyService,
  ) {
    this.maxRetry = this.config.get<number>('PENDING_LOOKUP_MAX_RETRY') ?? 5
  }

  async enqueue(options: EnqueueOptions) {
    const { lookupType, dedupeKey, payload, priority = 'LOW' } = options

    try {
      // 256자 제한 truncate
      const safeDedupeKey = dedupeKey.length > 256 ? dedupeKey.slice(0, 256) : dedupeKey
      if (dedupeKey.length > 256) {
        this.logger.warn(`DedupeKey truncated: ${dedupeKey}`)
      }

      await db.insert(pendingLookups)
        .values({
          lookupType,
          dedupeKey: safeDedupeKey,
          payload,
          priority,
        })
        .onConflictDoNothing()
    } catch (err) {
      this.logger.error(`Failed to enqueue pending lookup: ${dedupeKey}`, err as Error)
      await this.notify.sendDiscord({
        level: 'critical',
        title: '❌ PendingLookup Enqueue 실패',
        description: `Key: ${dedupeKey}\nError: ${(err as Error).message}`,
      })
    }
  }

  async dequeueBatch(limit: number) {
    try {
      // priority='HIGH' 우선, 그 다음 오래된 순
      // FOR UPDATE SKIP LOCKED로 동시성 제어
      return await db.select()
        .from(pendingLookups)
        .where(
          and(
            isNull(pendingLookups.processedAt),
            lt(pendingLookups.retryCount, this.maxRetry)
          )
        )
        .orderBy(desc(sql`priority = 'HIGH'`), asc(pendingLookups.requestedAt))
        .limit(limit)
    } catch (err) {
      this.logger.error('Failed to dequeue batch', err as Error)
      return []
    }
  }

  async markProcessed(id: number) {
    await db.update(pendingLookups)
      .set({ processedAt: new Date() })
      .where(eq(pendingLookups.id, id))
  }

  async markFailed(id: number, error: string) {
    const safeError = error.length > 1000 ? error.slice(0, 1000) : error
    await db.update(pendingLookups)
      .set({
        retryCount: sql`${pendingLookups.retryCount} + 1`,
        lastError: safeError,
      })
      .where(eq(pendingLookups.id, id))
  }

  async getStats() {
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE processed_at IS NULL AND retry_count < ${this.maxRetry}) as pending,
        COUNT(*) FILTER (WHERE processed_at IS NULL AND retry_count >= ${this.maxRetry}) as failed,
        MIN(requested_at) FILTER (WHERE processed_at IS NULL AND retry_count < ${this.maxRetry}) as oldest_requested_at
      FROM nearbook.pending_lookups
    `)

    const row = stats[0] as any
    return {
      pending: Number(row.pending || 0),
      failed: Number(row.failed || 0),
      oldestRequestedAt: row.oldest_requested_at ? new Date(row.oldest_requested_at as string) : null,
    }
  }
}
