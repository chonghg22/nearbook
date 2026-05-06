import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { JeongbonaruClient } from './jeongbonaru.client'
import { JeongbonaruService } from './jeongbonaru.service'
import { PendingLookupService } from './pending-lookup.service'
import { PendingLookupCron } from './pending-lookup.cron'
import { QuotaModule } from '../quota/quota.module'
import { NotifyModule } from '../notify/notify.module'

@Module({
  imports: [
    QuotaModule,
    NotifyModule,
  ],
  providers: [
    JeongbonaruClient,
    JeongbonaruService,
    PendingLookupService,
    PendingLookupCron,
  ],
  exports: [JeongbonaruService, JeongbonaruClient, PendingLookupService, PendingLookupCron],
})
export class JeongbonaruModule {}
