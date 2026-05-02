import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { AppController } from './app.controller'
import { AuthModule } from './modules/auth/auth.module'
import { JeongbonaruModule } from './modules/jeongbonaru/jeongbonaru.module'
import { LibrariesModule } from './modules/libraries/libraries.module'
import { BooksModule } from './modules/books/books.module'
import { SearchModule } from './modules/search/search.module'
import { WishlistsModule } from './modules/wishlists/wishlists.module'
import { LibraryCardsModule } from './modules/library-cards/library-cards.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    JeongbonaruModule,
    LibrariesModule,
    BooksModule,
    AuthModule,
    SearchModule,
    WishlistsModule,
    LibraryCardsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
