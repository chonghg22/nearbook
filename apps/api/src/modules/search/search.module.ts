import { Module } from '@nestjs/common'
import { SearchController } from './search.controller'
import { SearchService } from './search.service'
import { JeongbonaruModule } from '../jeongbonaru/jeongbonaru.module'
import { LibrariesModule } from '../libraries/libraries.module'
import { HomeCurationsModule } from '../home-curations/home-curations.module'

@Module({
  imports: [JeongbonaruModule, LibrariesModule, HomeCurationsModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
