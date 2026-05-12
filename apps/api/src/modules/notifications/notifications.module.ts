import { Module } from '@nestjs/common'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
import { WishlistDigestCron } from './wishlist-digest.cron'
import { ResendClient } from './resend.client'
import { NotifyModule } from '../notify/notify.module'
import { PushService } from './push.service'
import { JeongbonaruModule } from '../jeongbonaru/jeongbonaru.module'

@Module({
  imports: [NotifyModule, JeongbonaruModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    WishlistDigestCron,
    ResendClient,
    PushService,
  ],
  exports: [NotificationsService, WishlistDigestCron, PushService],
})
export class NotificationsModule {}
