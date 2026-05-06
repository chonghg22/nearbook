import { Module } from '@nestjs/common'
import { QuotaService } from './quota.service'
import { QuotaCron } from './quota.cron'

@Module({
  providers: [QuotaService, QuotaCron],
  exports: [QuotaService],
})
export class QuotaModule {}
