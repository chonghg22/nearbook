import { Module } from '@nestjs/common'
import { JeongbonaruModule } from '../jeongbonaru/jeongbonaru.module'
import { HomeCurationsCron } from './workers/home-curations.cron'
import { HomeCurationsService } from './services/home-curations.service'

@Module({
  imports: [JeongbonaruModule],
  providers: [HomeCurationsService, HomeCurationsCron],
  exports: [HomeCurationsService],
})
export class HomeCurationsModule {}
