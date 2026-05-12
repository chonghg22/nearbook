import { Module } from '@nestjs/common'
import { ResendWebhookController } from './resend.controller'
import { ResendWebhookService } from './resend-webhook.service'

@Module({
  controllers: [ResendWebhookController],
  providers: [ResendWebhookService],
})
export class WebhooksModule {}
