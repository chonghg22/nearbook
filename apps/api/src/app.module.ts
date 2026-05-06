import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './modules/auth/auth.module'
import { JeongbonaruModule } from './modules/jeongbonaru/jeongbonaru.module'
import { LibrariesModule } from './modules/libraries/libraries.module'
import { BooksModule } from './modules/books/books.module'
import { SearchModule } from './modules/search/search.module'
import { WishlistsModule } from './modules/wishlists/wishlists.module'
import { LibraryCardsModule } from './modules/library-cards/library-cards.module'
import { NoticesModule } from './modules/notices/notices.module'
import { FeedbackModule } from './modules/feedback/feedback.module'
import { NotifyModule } from './modules/notify/notify.module'
import { CommonModule } from './common/common.module'
import { CacheModule } from './common/cache/cache.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1_000, limit: 10 },
      { name: 'medium', ttl: 60_000, limit: 100 },
    ]),
    ScheduleModule.forRoot(),
    CacheModule,
    CommonModule,
    NotifyModule,
    JeongbonaruModule,
    LibrariesModule,
    BooksModule,
    AuthModule,
    SearchModule,
    WishlistsModule,
    LibraryCardsModule,
    NoticesModule,
    FeedbackModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
