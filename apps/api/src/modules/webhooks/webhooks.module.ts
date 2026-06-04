import { Module } from '@nestjs/common'
import { ResendWebhookController } from './controllers/resend.controller'
import { ResendWebhookService } from './services/resend-webhook.service'

@Module({
  controllers: [ResendWebhookController],
  providers: [ResendWebhookService],
})
export class WebhooksModule {}
