import { ConfigService } from '@nestjs/config'
import { KakaoOAuthClient } from './kakao-oauth.client'

const REDIRECT = 'https://www.near-book.com/auth/callback'

function client(env: Record<string, string | undefined>) {
  return new KakaoOAuthClient({ get: (key: string) => env[key] } as unknown as ConfigService)
}

describe('KakaoOAuthClient', () => {
  const env = { KAKAO_REST_API_KEY: 'rest-key', KAKAO_CLIENT_SECRET: 'client-secret', AUTH_REDIRECT_URIS: `${REDIRECT}, http://localhost:3000/auth/callback` }
  const fetchMock = jest.fn()
  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('exchanges the code server-side and returns only the stable Kakao id and nickname', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'kakao-access' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 4242, kakao_account: { profile: { nickname: ' 독자 ' } } })))
    await expect(client(env).exchangeCode('the-code', REDIRECT)).resolves.toEqual({ providerUserId: '4242', nickname: '독자' })
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0]
    expect(tokenUrl).toBe('https://kauth.kakao.com/oauth/token')
    const body = new URLSearchParams(tokenInit.body as URLSearchParams)
    expect(Object.fromEntries(body)).toEqual({
      grant_type: 'authorization_code', client_id: 'rest-key', redirect_uri: REDIRECT, code: 'the-code', client_secret: 'client-secret',
    })
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ Authorization: 'Bearer kakao-access' })
  })

  it('refuses before any network call when unconfigured or the redirect URI is not allowlisted', async () => {
    await expect(client({}).exchangeCode('c', REDIRECT)).rejects.toMatchObject({ reason: 'not-configured' })
    await expect(client(env).exchangeCode('c', 'https://evil.example/auth/callback')).rejects.toMatchObject({ reason: 'redirect-not-allowed' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps provider failures without leaking provider responses', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"error":"invalid_grant"}', { status: 400 }))
    await expect(client(env).exchangeCode('used', REDIRECT)).rejects.toMatchObject({ reason: 'exchange-failed' })
    fetchMock.mockRejectedValueOnce(new Error('network'))
    await expect(client(env).exchangeCode('c', REDIRECT)).rejects.toMatchObject({ reason: 'exchange-failed' })
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'ok' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ properties: {} })))
    await expect(client(env).exchangeCode('c', REDIRECT)).rejects.toMatchObject({ reason: 'profile-failed' })
  })
})
