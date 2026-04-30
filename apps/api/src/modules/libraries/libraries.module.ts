import { Module } from '@nestjs/common'
import { LibrariesController } from './libraries.controller'
import { LibrariesService } from './libraries.service'
import { JeongbonaruModule } from '../jeongbonaru/jeongbonaru.module'

@Module({
  imports: [JeongbonaruModule],
  controllers: [LibrariesController],
  providers: [LibrariesService],
  exports: [LibrariesService],
})
export class LibrariesModule {}
