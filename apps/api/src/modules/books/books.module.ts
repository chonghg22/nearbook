import { Module } from '@nestjs/common'
import { BooksController } from './controllers/books.controller'
import { BooksService } from './services/books.service'
import { BooksRepository } from './repositories/books.repository'
import { JeongbonaruModule } from '../jeongbonaru/jeongbonaru.module'
import { LibrariesModule } from '../libraries/libraries.module'
import { AffiliatesModule } from '../affiliates/affiliates.module'
import { HomeCurationsModule } from '../home-curations/home-curations.module'

@Module({
  imports: [JeongbonaruModule, LibrariesModule, AffiliatesModule, HomeCurationsModule],
  controllers: [BooksController],
  providers: [BooksService, BooksRepository],
  exports: [BooksService],
})
export class BooksModule {}
