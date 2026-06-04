import { Module, Global } from '@nestjs/common'
import { NotifyService } from './services/notify.service'

@Global()
@Module({
  providers: [NotifyService],
  exports: [NotifyService],
})
export class NotifyModule {}
