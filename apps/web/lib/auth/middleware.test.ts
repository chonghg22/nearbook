import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocked = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('@/lib/auth/api', () => ({ refreshSession: mocked.refresh }))
import { middleware } from '../../middleware'

const secret = 'isolated-unit-secret-0123456789abcdef'
const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
function token(exp: number) {
  const unsigned = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 's', sid: 'x', prv: 'kakao', iss: 'nearbook-api', aud: 'nearbook', exp })}`
  return `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`
}
const now = () => Math.floor(Date.now() / 1000)
const request = (cookie: string) => new NextRequest('https://near.example/me', { headers: { cookie } })
const refreshToken = 'r'.repeat(43)

beforeEach(() => {
  vi.stubEnv('AUTH_JWT_SECRET', secret)
  mocked.refresh.mockReset()
})
afterEach(() => vi.unstubAllEnvs())

it('does nothing for anonymous visitors or a fresh access token', async () => {
  await middleware(request(''))
  await middleware(request(`nb_at=${token(now() + 600)}; nb_rt=${refreshToken}`))
  expect(mocked.refresh).not.toHaveBeenCalled()
})

it('refreshes a nearly expired token and forwards the new cookie to this request and the browser', async () => {
  const fresh = token(now() + 900)
  mocked.refresh.mockResolvedValue({ status: 'ok', session: { accessToken: fresh, accessTokenExpiresAt: now() + 900, refreshTokenExpiresAt: now() + 86400, user: { id: 's', nickname: null, provider: 'kakao' } } })
  const response = await middleware(request(`nb_at=${token(now() + 10)}; nb_rt=${refreshToken}`))
  expect(mocked.refresh).toHaveBeenCalledWith(refreshToken)
  expect(response.headers.getSetCookie().some((c) => c.startsWith(`nb_at=${fresh}`))).toBe(true)
  expect(response.headers.get('x-middleware-request-cookie') ?? response.headers.get('x-middleware-override-headers')).toBeTruthy()
})

it('clears cookies only when the refresh token is definitively rejected', async () => {
  mocked.refresh.mockResolvedValueOnce({ status: 'rejected' })
  const rejected = await middleware(request(`nb_rt=${refreshToken}`))
  expect(rejected.headers.getSetCookie().filter((c) => /^nb_(at|rt)=;/.test(c))).toHaveLength(2)

  mocked.refresh.mockResolvedValueOnce({ status: 'unavailable' })
  const offline = await middleware(request(`nb_rt=${refreshToken}`))
  expect(offline.headers.getSetCookie().some((c) => c.startsWith('nb_'))).toBe(false)
})

it('removes legacy Supabase cookies', async () => {
  const response = await middleware(request('sb-project-auth-token=legacy'))
  expect(response.headers.getSetCookie().some((c) => c.startsWith('sb-project-auth-token=;'))).toBe(true)
})
