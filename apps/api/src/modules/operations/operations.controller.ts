import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { db, sql } from '@nearbook/db'
import { QuotaService } from '../quota/quota.service'
import { CURATION_JOBS, JobStatusService } from './job-status.service'

/** Aggregate read-only status. No credentials, private lists, query payloads or refresh endpoint. */
@Controller('operations')
export class OperationsController {
  constructor(
    private readonly quota: QuotaService,
    private readonly jobs: JobStatusService,
    private readonly scheduler: SchedulerRegistry
  ) {}

  @Get('status')
  @Header('Cache-Control', 'no-store')
  async status() {
    try {
      const [quota, snapshots] = await Promise.all([
        this.quota.getStatus(),
        db.execute(sql`
          WITH snapshots AS (
            SELECT 'home:' || section AS section, period_key, fetched_at FROM nearbook.home_curations
            UNION ALL SELECT 'categories', period_key, fetched_at FROM nearbook.category_curations
            UNION ALL SELECT 'new-arrivals', period_key, fetched_at FROM nearbook.library_curations WHERE section = 'new_arrivals'
          ), latest AS (SELECT section, max(period_key) AS period_key FROM snapshots GROUP BY section)
          SELECT s.section, s.period_key, count(*)::int AS count,
            min(s.fetched_at) AT TIME ZONE 'UTC' AS oldest_fetched_at,
            max(s.fetched_at) AT TIME ZONE 'UTC' AS latest_fetched_at
          FROM snapshots s JOIN latest l ON s.section = l.section AND s.period_key = l.period_key
          GROUP BY s.section, s.period_key ORDER BY s.section
        `),
      ])
      const registered = this.scheduler.getCronJobs()
      return {
        status: 'ok',
        observedAt: new Date().toISOString(),
        quota,
        runtimeStartedAt: this.jobs.runtimeStartedAt,
        jobs: Object.entries(CURATION_JOBS).map(([name, schedule]) => ({
          name,
          schedule,
          timezone: 'Asia/Seoul',
          registered: registered.has(name),
          lastRun: this.jobs.getStatus()[name] ?? null,
        })),
        quotaObserverRegistered: registered.has('quota:observe'),
        pendingLookup: {
          registered: false,
          enabled: false,
          reason: 'not-registered-no-activation-in-this-release',
        },
        snapshots: [...snapshots],
        evidence: {
          jobHistory: 'current-process-only',
          snapshots: 'stored-rows-not-proof-of-a-complete-job',
          notificationDelivery: 'deferred-unchanged',
        },
      }
    } catch {
      throw new ServiceUnavailableException('Operational status is temporarily unavailable')
    }
  }
}
