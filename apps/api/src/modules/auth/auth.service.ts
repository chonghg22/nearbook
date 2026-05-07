import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { db, users, eq } from '@nearbook/db'
import type { AuthUser } from './jwt-payload.interface'

@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  private getSupabaseOrigin() {
    const rawUrl = this.config.get<string>('SUPABASE_URL') ?? ''
    return rawUrl.replace(/\/rest\/v1\/?$/, '')
  }

  private decodeJwtFallback(accessToken: string): AuthUser | null {
    try {
      const [, payload] = accessToken.split('.')
      if (!payload) return null

      const decoded = Buffer.from(payload, 'base64url').toString('utf8')
      const parsed = JSON.parse(decoded) as {
        sub?: string
        email?: string
        exp?: number
        app_metadata?: { provider?: string }
      }

      if (!parsed.sub || !parsed.exp) return null
      if (parsed.exp * 1000 <= Date.now()) return null

      return {
        supabaseUserId: parsed.sub,
        email: parsed.email ?? '',
        provider: parsed.app_metadata?.provider ?? 'unknown',
      }
    } catch {
      return null
    }
  }

  async verifyAccessToken(accessToken: string): Promise<AuthUser | null> {
    const supabaseOrigin = this.getSupabaseOrigin()
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseOrigin || !serviceRoleKey) {
      return this.config.get<string>('NODE_ENV') === 'production'
        ? null
        : this.decodeJwtFallback(accessToken)
    }

    const res = await fetch(`${supabaseOrigin}/auth/v1/user`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!res.ok) {
      return this.config.get<string>('NODE_ENV') === 'production'
        ? null
        : this.decodeJwtFallback(accessToken)
    }

    const user = await res.json() as {
      id: string
      email?: string | null
      app_metadata?: { provider?: string }
    }

    return {
      supabaseUserId: user.id,
      email: user.email ?? '',
      provider: user.app_metadata?.provider ?? 'unknown',
    }
  }

  async getOrCreateUser(supabaseUserId: string, email?: string, nickname?: string) {
    const existing = await db.query.users.findFirst({
      where: eq(users.supabaseUserId, supabaseUserId),
    })
    if (existing) return existing

    const [created] = await db.insert(users).values({
      supabaseUserId,
      email: email ?? null,
      nickname: nickname ?? null,
    }).returning()

    return created
  }
}
