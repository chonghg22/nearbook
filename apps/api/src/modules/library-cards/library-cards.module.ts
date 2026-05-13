import { Module } from '@nestjs/common'
import { LibraryCardsController } from './library-cards.controller'
import { LibraryCardsService } from './library-cards.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [LibraryCardsController],
  providers: [LibraryCardsService],
  exports: [LibraryCardsService],
})
export class LibraryCardsModule {}
