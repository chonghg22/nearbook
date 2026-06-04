import { Module } from '@nestjs/common'
import { LibraryCardsController } from './controllers/library-cards.controller'
import { LibraryCardsService } from './services/library-cards.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [LibraryCardsController],
  providers: [LibraryCardsService],
})
export class LibraryCardsModule {}
