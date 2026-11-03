import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { KakaoOAuthError, type KakaoOAuthClient } from './kakao-oauth.client'
import type { SessionService } from './session.service'

jest.mock('./auth.guard', () => ({ AuthGuard: class {} }))
jest.mock('@nearbook/db', () => ({}))

describe('AuthController session endpoints', () => {
  const kakao = { exchangeCode: jest.fn() }
  const sessions = { signIn: jest.fn(), refresh: jest.fn(), revoke: jest.fn() }
  const env: Record<string, string> = { AUTH_JWT_SECRET: 's'.repeat(32) }
  const config = { get: (key: string) => env[key] }
  const controller = new AuthController(kakao as unknown as KakaoOAuthClient, sessions as unknown as SessionService, config as never)
  const body = { code: 'c', redirectUri: 'https://www.near-book.com/auth/callback' }
  beforeEach(() => jest.resetAllMocks())

  it('opens a session for the verified Kakao identity', async () => {
    kakao.exchangeCode.mockResolvedValue({ providerUserId: '42', nickname: '독자' })
    sessions.signIn.mockResolvedValue({ accessToken: 't' })
    await expect(controller.kakaoSession(body, 'agent')).resolves.toEqual({ accessToken: 't' })
    expect(sessions.signIn).toHaveBeenCalledWith('kakao', '42', '독자', 'agent')
  })

  it('reports an unconfigured login as unavailable and every other provider failure as 401', async () => {
    kakao.exchangeCode.mockRejectedValueOnce(new KakaoOAuthError('not-configured'))
    await expect(controller.kakaoSession(body)).rejects.toBeInstanceOf(ServiceUnavailableException)
    kakao.exchangeCode.mockRejectedValueOnce(new KakaoOAuthError('redirect-not-allowed'))
    await expect(controller.kakaoSession(body)).rejects.toBeInstanceOf(UnauthorizedException)
    expect(sessions.signIn).not.toHaveBeenCalled()
  })

  it('refuses to open a session without a strong signing secret', async () => {
    const weak = new AuthController(kakao as unknown as KakaoOAuthClient, sessions as unknown as SessionService, { get: () => 'short' } as never)
    await expect(weak.kakaoSession(body)).rejects.toBeInstanceOf(ServiceUnavailableException)
    expect(kakao.exchangeCode).not.toHaveBeenCalled()
  })

  it('returns 401 for an unusable refresh token and revokes on logout', async () => {
    sessions.refresh.mockResolvedValue(null)
    await expect(controller.refresh({ refreshToken: 'x'.repeat(43) })).rejects.toBeInstanceOf(UnauthorizedException)
    await controller.logout({ refreshToken: 'y'.repeat(43) })
    expect(sessions.revoke).toHaveBeenCalledWith('y'.repeat(43))
  })
})
