import { Module } from '@nestjs/common'
import { JeongbonaruModule } from '../jeongbonaru/jeongbonaru.module'
import { HomeCurationsCron } from './home-curations.cron'
import { HomeCurationsService } from './home-curations.service'

@Module({
  imports: [JeongbonaruModule],
  providers: [HomeCurationsService, HomeCurationsCron],
  exports: [HomeCurationsService],
})
export class HomeCurationsModule {}
