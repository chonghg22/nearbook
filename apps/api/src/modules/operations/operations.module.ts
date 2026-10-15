import { Module } from '@nestjs/common'
import { QuotaModule } from '../quota/quota.module'
import { JobStatusService } from './job-status.service'
import { OperationsController } from './operations.controller'

@Module({
  imports: [QuotaModule],
  providers: [JobStatusService],
  controllers: [OperationsController],
  exports: [JobStatusService],
})
export class OperationsModule {}
