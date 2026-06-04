import { Module } from '@nestjs/common'
import { QuotaService } from './services/quota.service'
import { QuotaCron } from './workers/quota.cron'

@Module({
  providers: [QuotaService, QuotaCron],
  exports: [QuotaService],
})
export class QuotaModule {}
