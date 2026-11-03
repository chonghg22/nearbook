import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export class KakaoOAuthError extends Error {
  constructor(readonly reason: 'not-configured' | 'redirect-not-allowed' | 'exchange-failed' | 'profile-failed') {
    super(reason)
  }
}

export interface KakaoProfile {
  providerUserId: string
  nickname?: string
}

const TOKEN_URL = 'https://kauth.kakao.com/oauth/token'
const PROFILE_URL = 'https://kapi.kakao.com/v2/user/me'
const TIMEOUT_MS = 8_000

/** Server-side Kakao authorization-code exchange. Never returns provider tokens to callers. */
@Injectable()
export class KakaoOAuthClient {
  constructor(private readonly config: ConfigService) {}

  /** Exact-match allowlist; Kakao also enforces its own registered redirect URIs. */
  allowedRedirectUris(): string[] {
    return (this.config.get<string>('AUTH_REDIRECT_URIS') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  }

  async exchangeCode(code: string, redirectUri: string): Promise<KakaoProfile> {
    const clientId = this.config.get<string>('KAKAO_REST_API_KEY')?.trim()
    const clientSecret = this.config.get<string>('KAKAO_CLIENT_SECRET')?.trim()
    if (!clientId) throw new KakaoOAuthError('not-configured')
    if (!this.allowedRedirectUris().includes(redirectUri)) throw new KakaoOAuthError('redirect-not-allowed')

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
    })
    if (clientSecret) body.set('client_secret', clientSecret)

    let accessToken: string
    try {
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!res.ok) throw new KakaoOAuthError('exchange-failed')
      const token = (await res.json()) as { access_token?: unknown }
      if (typeof token.access_token !== 'string' || !token.access_token) throw new KakaoOAuthError('exchange-failed')
      accessToken = token.access_token
    } catch (error) {
      if (error instanceof KakaoOAuthError) throw error
      throw new KakaoOAuthError('exchange-failed')
    }

    try {
      const res = await fetch(PROFILE_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!res.ok) throw new KakaoOAuthError('profile-failed')
      const profile = (await res.json()) as {
        id?: unknown
        properties?: { nickname?: unknown }
        kakao_account?: { profile?: { nickname?: unknown } }
      }
      if ((typeof profile.id !== 'number' && typeof profile.id !== 'string') || `${profile.id}` === '')
        throw new KakaoOAuthError('profile-failed')
      const nickname = profile.kakao_account?.profile?.nickname ?? profile.properties?.nickname
      return {
        providerUserId: `${profile.id}`,
        nickname: typeof nickname === 'string' && nickname.trim() ? nickname.trim().slice(0, 64) : undefined,
      }
    } catch (error) {
      if (error instanceof KakaoOAuthError) throw error
      throw new KakaoOAuthError('profile-failed')
    }
  }
}
