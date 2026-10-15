import { Module } from '@nestjs/common'
import { WishlistsController } from './wishlists.controller'
import { WishlistsService } from './wishlists.service'
import { JeongbonaruModule } from '../jeongbonaru/jeongbonaru.module'

@Module({
  imports: [JeongbonaruModule],
  controllers: [WishlistsController],
  providers: [WishlistsService],
})
export class WishlistsModule {}
