import { Module } from '@nestjs/common'
import { JeongbonaruModule } from '../jeongbonaru/jeongbonaru.module'
import { HomeCurationsCron } from './home-curations.cron'
import { HomeCurationsService } from './home-curations.service'
import { OperationsModule } from '../operations/operations.module'

@Module({
  imports: [JeongbonaruModule, OperationsModule],
  providers: [HomeCurationsService, HomeCurationsCron],
  exports: [HomeCurationsService],
})
export class HomeCurationsModule {}
