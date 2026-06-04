import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export type NotifyLevel = 'info' | 'warn' | 'critical' | 'recovery' | 'abuse'

interface DiscordField {
  name: string
  value: string
  inline?: boolean
}

export interface NotifyParams {
  level: NotifyLevel
  title: string
  description?: string
  fields?: DiscordField[]
  cooldownKey?: string
  cooldownMs?: number
}

const COLOR_MAP: Record<NotifyLevel, number> = {
  info: 0x3b82f6,      // blue
  warn: 0xf59e0b,      // amber
  critical: 0xef4444,  // red
  recovery: 0x22c55e,  // green
  abuse: 0xa855f7,     // purple
}

const EMOJI_MAP: Record<NotifyLevel, string> = {
  info: 'ℹ️',
  warn: '🟡',
  critical: '🔴',
  recovery: '🟢',
  abuse: '🐛',
}

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name)
  private readonly cooldowns = new Map<string, number>()  // key → expiresAtMs

  constructor(private readonly config: ConfigService) {}

  async sendDiscord(params: NotifyParams): Promise<{ sent: boolean; reason?: string }> {
    const webhook = this.config.get<string>('DISCORD_WEBHOOK_URL')
    if (!webhook) {
      this.logger.debug(`Discord webhook not configured, skip: ${params.title}`)
      return { sent: false, reason: 'no_webhook' }
    }

    // 쿨다운 체크
    if (params.cooldownKey && params.cooldownMs) {
      const now = Date.now()
      const expiresAt = this.cooldowns.get(params.cooldownKey)
      if (expiresAt && expiresAt > now) {
        return { sent: false, reason: 'cooldown' }
      }
      this.cooldowns.set(params.cooldownKey, now + params.cooldownMs)
    }

    const emoji = EMOJI_MAP[params.level]
    const color = COLOR_MAP[params.level]

    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `${emoji} ${params.title}`,
            description: params.description,
            color,
            fields: params.fields ?? [],
            timestamp: new Date().toISOString(),
          }],
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        this.logger.error(`Discord webhook failed: ${res.status} ${text}`)
        return { sent: false, reason: `http_${res.status}` }
      }

      return { sent: true }
    } catch (err) {
      this.logger.error(`Discord webhook exception`, err as Error)
      return { sent: false, reason: 'exception' }
    }
  }
}
