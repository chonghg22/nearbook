import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { db, users, eq } from '@nearbook/db'
import type { AuthUser } from './jwt-payload.interface'
import { SessionService } from './session.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly sessions: SessionService,
  ) {}

  /** Legacy Supabase verification stays only while SUPABASE_URL/SERVICE_ROLE_KEY are configured. */
  private legacySupabaseEnabled() {
    return Boolean(this.getSupabaseOrigin() && this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY'))
  }

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
    const claims = await this.sessions.verify(accessToken)
    if (claims) {
      return {
        supabaseUserId: claims.sub,
        email: '',
        provider: claims.prv,
        nickname: claims.nick,
      }
    }
    return this.verifyLegacySupabaseToken(accessToken)
  }

  private async verifyLegacySupabaseToken(accessToken: string): Promise<AuthUser | null> {
    const supabaseOrigin = this.getSupabaseOrigin()
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')

    if (!this.legacySupabaseEnabled() || !serviceRoleKey) {
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
      user_metadata?: { nickname?: string; name?: string }
    }

    const nickname = user.user_metadata?.nickname ?? user.user_metadata?.name
    return {
      supabaseUserId: user.id,
      email: user.email ?? '',
      provider: user.app_metadata?.provider ?? 'unknown',
      nickname: typeof nickname === 'string' ? nickname.slice(0, 64) : undefined,
    }
  }

  async getOrCreateUser(supabaseUserId: string, email?: string, nickname?: string) {
    const existing = await db.query.users.findFirst({
      where: eq(users.supabaseUserId, supabaseUserId),
    })
    if (existing) return existing

    const [created] = await db.insert(users).values({
      supabaseUserId,
      email: email?.trim() || null,
      nickname: nickname ?? null,
    }).onConflictDoNothing({ target: users.supabaseUserId }).returning()

    if (created) return created
    // Two verified requests may initialize the same account concurrently.
    const concurrent = await db.query.users.findFirst({
      where: eq(users.supabaseUserId, supabaseUserId),
    })
    if (!concurrent) throw new Error('Unable to initialize local user')
    return concurrent
  }
}
