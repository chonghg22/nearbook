import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { AppController } from './app.controller'
import { AppService } from './app.service'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    // TODO Step 4: JeongbonaruModule
    // TODO Step 2: LibrariesModule, BooksModule
    // TODO Step 8: AuthModule
    // TODO Step 9: WishlistModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
