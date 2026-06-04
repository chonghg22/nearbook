import {
  BadRequestException,
  Controller,
  Headers,
  Logger,
  Post,
  Req,
} from '@nestjs/common'
import type { Request } from 'express'
import { Webhook } from 'svix'
import { ResendWebhookEvent, ResendWebhookService } from '../services/resend-webhook.service'

@Controller('webhooks')
export class ResendWebhookController {
  private readonly logger = new Logger(ResendWebhookController.name)

  constructor(private readonly service: ResendWebhookService) {}

  @Post('resend')
  async handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    const secret = process.env.RESEND_WEBHOOK_SECRET
    if (!secret) {
      throw new BadRequestException('webhook secret not configured')
    }

    const rawPayload = req.rawBody?.toString('utf8')
    if (!rawPayload) {
      throw new BadRequestException('raw body missing')
    }

    try {
      const event = new Webhook(secret).verify(rawPayload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ResendWebhookEvent

      await this.service.handleEvent(event)
      return { received: true }
    } catch (err) {
      this.logger.warn(`Invalid Resend webhook signature: ${String(err)}`)
      throw new BadRequestException('invalid signature')
    }
  }
}
