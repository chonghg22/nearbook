import { Module } from '@nestjs/common'
import { LibrariesController } from './controllers/libraries.controller'
import { LibrariesService } from './services/libraries.service'
import { JeongbonaruModule } from '../jeongbonaru/jeongbonaru.module'
import { HomeCurationsModule } from '../home-curations/home-curations.module'

@Module({
  imports: [JeongbonaruModule, HomeCurationsModule],
  controllers: [LibrariesController],
  providers: [LibrariesService],
  exports: [LibrariesService],
})
export class LibrariesModule {}
