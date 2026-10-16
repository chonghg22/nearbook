import { Module } from '@nestjs/common'
import { SearchController } from './search.controller'
import { SearchService } from './search.service'
import { SearchIndexModule } from './search-index.module'
import { AladdinFallbackService } from './aladdin-fallback.service'
import { SearchSyncCron } from './search-sync.cron'
import { HomeCurationsModule } from '../home-curations/home-curations.module'
import { JeongbonaruModule } from '../jeongbonaru/jeongbonaru.module'

@Module({
  imports: [HomeCurationsModule, JeongbonaruModule, SearchIndexModule],
  controllers: [SearchController],
  providers: [SearchService, AladdinFallbackService, SearchSyncCron],
  exports: [SearchService, SearchIndexModule, AladdinFallbackService],
})
export class SearchModule {}
