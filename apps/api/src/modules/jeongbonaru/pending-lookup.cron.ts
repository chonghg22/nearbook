import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { PendingLookupService } from './pending-lookup.service'
import { JeongbonaruService } from './jeongbonaru.service'
import { AladdinFallbackService } from '../search/aladdin-fallback.service'
import { NotifyService } from '../notify/notify.service'

@Injectable()
export class PendingLookupCron {
  private readonly logger = new Logger(PendingLookupCron.name)
  private readonly dailyBudget: number

  constructor(
    private readonly config: ConfigService,
    private readonly pendingService: PendingLookupService,
    private readonly jeongbonaruService: JeongbonaruService,
    private readonly aladdin: AladdinFallbackService,
    private readonly notify: NotifyService,
  ) {
    this.dailyBudget = this.config.get<number>('PENDING_LOOKUP_DAILY_BUDGET') ?? 150
  }

  @Cron('5 0 * * *', { timeZone: 'Asia/Seoul' })
  async processPending() {
    const startedAt = new Date()
    let success = 0
    let failed = 0

    const batch = await this.pendingService.dequeueBatch(this.dailyBudget)
    if (batch.length === 0) {
      return
    }

    this.logger.log(`Processing pending batch: ${batch.length} items`)

    for (const row of batch) {
      try {
        await this.processOne(row)
        await this.pendingService.markProcessed(row.id)
        success++
      } catch (err: any) {
        await this.pendingService.markFailed(row.id, err?.message ?? 'unknown')
        failed++
        this.logger.warn(`Pending lookup fail (id=${row.id}, type=${row.lookupType}): ${err?.message}`)
      }
    }

    const stats = await this.pendingService.getStats()
    const durationMs = Date.now() - startedAt.getTime()

    await this.notify.sendDiscord({
      level: failed > 0 ? 'warn' : 'info',
      title: '📦 Pending Lookups 일일 처리 리포트',
      description: [
        `✅ 처리 성공: ${success}건`,
        `❌ 처리 실패: ${failed}건`,
        `⏳ 잔여 미처리: ${stats.pending}건`,
        `💀 영구 실패: ${stats.failed}건 (retry_count 초과)`,
        stats.oldestRequestedAt ? `🕒 가장 오래된 요청: ${stats.oldestRequestedAt.toISOString()}` : '',
        `⏱️ 소요 시간: ${durationMs}ms`,
      ].filter(Boolean).join('\n'),
    })
  }

  private async processOne(row: any) {
    const { lookupType, payload } = row

    switch (lookupType) {
      case 'isbn':
        await this.jeongbonaruService.getBookByIsbnAsCron(payload.isbn)
        break
      case 'keyword':
        // 알라딘을 메인 소스로 사용 (정보나루 대신)
        await this.aladdin.searchAndCache(payload.keyword)
        break
      case 'lib_book':
        await this.jeongbonaruService.getBookOwnershipAsCron(payload.isbn, payload.libCode)
        break
      default:
        throw new Error(`Unknown lookup type: ${lookupType}`)
    }
  }
}
