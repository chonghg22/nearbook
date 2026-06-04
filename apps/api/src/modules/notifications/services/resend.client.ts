import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

interface SendArgs {
  to: string
  subject: string
  html: string
  text: string
  tag: string
  unsubscribeUrl?: string
}

@Injectable()
export class ResendClient {
  private readonly logger = new Logger(ResendClient.name)

  constructor(private readonly config: ConfigService) {}

  async send(args: SendArgs) {
    const apiKey = this.config.get<string>('RESEND_API_KEY')
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY 미설정 — 메일 발송을 건너뜀')
      return { ok: false, messageId: null as string | null }
    }

    const recipient = this.getRecipient(args.to)
    const from = this.config.get<string>('RESEND_FROM_EMAIL') ?? '우리동네책 <notify@우리동네책.kr>'
    const headers: Record<string, string> = {}

    if (args.unsubscribeUrl) {
      headers['List-Unsubscribe'] = `<${args.unsubscribeUrl}>`
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'nearbook-api/notifications',
        },
        body: JSON.stringify({
          from,
          to: [recipient],
          subject: args.subject,
          html: args.html,
          text: args.text,
          headers,
          tags: [{ name: 'category', value: args.tag }],
        }),
      })

      const json = await res.json().catch(() => ({})) as { id?: string; message?: string; name?: string }
      if (!res.ok || !json.id) {
        this.logger.error(`Resend send failed: ${res.status} ${json.name ?? json.message ?? 'unknown_error'}`)
        return { ok: false, messageId: null as string | null }
      }

      return { ok: true, messageId: json.id }
    } catch (err) {
      this.logger.error('Resend send failed', err as Error)
      return { ok: false, messageId: null as string | null }
    }
  }

  private getRecipient(to: string) {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      return to
    }

    return this.config.get<string>('RESEND_DEV_EMAIL') ?? 'dev@우리동네책.kr'
  }
}
