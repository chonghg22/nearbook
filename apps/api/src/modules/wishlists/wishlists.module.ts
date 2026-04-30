import { Module } from '@nestjs/common'
import { WishlistsController } from './wishlists.controller'
import { WishlistsService } from './wishlists.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [WishlistsController],
  providers: [WishlistsService],
})
export class WishlistsModule {}
