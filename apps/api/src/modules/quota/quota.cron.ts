import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { QuotaService } from './quota.service'

/** Observation/logs only. Never activates the previously dormant Discord sender. */
@Injectable()
export class QuotaCron {
  private readonly logger = new Logger(QuotaCron.name)
  private running = false
  private previousMode: string | null = null
  constructor(private readonly quota: QuotaService) {}
  @Cron(CronExpression.EVERY_MINUTE, { name: 'quota:observe' })
  async checkThresholds() {
    if (this.running) return
    this.running = true
    try {
      const status = await this.quota.getStatus()
      if (status.mode !== this.previousMode) {
        this.logger.log(
          JSON.stringify({
            event: 'quota-mode',
            mode: status.mode,
            called: status.called,
            limit: status.limit,
          })
        )
        this.previousMode = status.mode
      }
    } catch {
      this.logger.error('quota observation failed')
      this.previousMode = 'unavailable'
    } finally {
      this.running = false
    }
  }
}
