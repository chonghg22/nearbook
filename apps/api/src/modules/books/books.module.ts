import { Module } from '@nestjs/common'
import { BooksController } from './books.controller'
import { BooksService } from './books.service'
import { BooksRepository } from './books.repository'
import { JeongbonaruModule } from '../jeongbonaru/jeongbonaru.module'
import { LibrariesModule } from '../libraries/libraries.module'
import { AffiliatesModule } from '../affiliates/affiliates.module'

@Module({
  imports: [JeongbonaruModule, LibrariesModule, AffiliatesModule],
  controllers: [BooksController],
  providers: [BooksService, BooksRepository],
  exports: [BooksService],
})
export class BooksModule {}
