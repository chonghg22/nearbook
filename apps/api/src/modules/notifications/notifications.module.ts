import { Module } from '@nestjs/common'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
import { WishlistDigestCron } from './wishlist-digest.cron'
import { ResendClient } from './resend.client'
import { NotifyModule } from '../notify/notify.module'

@Module({
  imports: [NotifyModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    WishlistDigestCron,
    ResendClient,
  ],
  exports: [NotificationsService, WishlistDigestCron],
})
export class NotificationsModule {}
