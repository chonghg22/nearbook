import { beforeEach, expect, it, vi } from 'vitest'
import { GET } from './route'

const mocked = vi.hoisted(() => ({
  open: vi.fn(),
  cookies: new Map<string, string>(),
}))
vi.mock('@/lib/auth/api', () => ({ openKakaoSession: mocked.open }))
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (mocked.cookies.has(name) ? { name, value: mocked.cookies.get(name) } : undefined),
    getAll: () => [...mocked.cookies].map(([name, value]) => ({ name, value })),
  }),
}))

const STATE = 'state-value-0123456789abcdef'
const session = {
  accessToken: 'access.jwt.value',
  accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 900,
  refreshToken: 'r'.repeat(43),
  refreshTokenExpiresAt: Math.floor(Date.now() / 1000) + 86400,
  user: { id: 'subject', nickname: '독자', provider: 'kakao' },
}

beforeEach(() => {
  mocked.open.mockReset()
  mocked.open.mockResolvedValue({ status: 'ok', session })
  mocked.cookies = new Map([['nb_oauth', JSON.stringify({ state: STATE, next: '/me/libraries' })]])
})

function setCookies(response: Response) {
  return response.headers.getSetCookie()
}

it('a matching state opens a session, sets httpOnly cookies and returns to the bound internal route', async () => {
  mocked.cookies.set('sb-project-auth-token', 'legacy')
  const response = await GET(new Request(`https://near.example/auth/callback?code=test-code&state=${STATE}`))
  expect(response.headers.get('location')).toBe('https://near.example/me/libraries')
  expect(mocked.open).toHaveBeenCalledExactlyOnceWith('test-code', 'https://near.example/auth/callback', null)
  const cookies = setCookies(response)
  expect(cookies.find((c) => c.startsWith('nb_at=access.jwt.value'))).toMatch(/HttpOnly.*Secure|Secure.*HttpOnly/i)
  expect(cookies.find((c) => c.startsWith(`nb_rt=${'r'.repeat(43)}`))).toMatch(/SameSite=lax/i)
  expect(cookies.some((c) => c.startsWith('nb_oauth=;'))).toBe(true)
  expect(cookies.some((c) => c.startsWith('sb-project-auth-token=;'))).toBe(true)
})

it('a missing or mismatched state never exchanges the code', async () => {
  const forged = await GET(new Request('https://near.example/auth/callback?code=test-code&state=attacker-state-000000'))
  expect(forged.headers.get('location')).toBe('https://near.example/login?error=auth&next=%2Fme%2Flibraries')
  mocked.cookies.clear()
  const missing = await GET(new Request(`https://near.example/auth/callback?code=test-code&state=${STATE}`))
  expect(missing.headers.get('location')).toBe('https://near.example/login?error=auth')
  expect(mocked.open).not.toHaveBeenCalled()
})

it('an unsafe bound return route cannot redirect outside this origin', async () => {
  mocked.cookies.set('nb_oauth', JSON.stringify({ state: STATE, next: '//evil.example' }))
  const response = await GET(new Request(`https://near.example/auth/callback?code=test-code&state=${STATE}`))
  expect(response.headers.get('location')).toBe('https://near.example/')
})

it('failed exchanges expose only the safe login retry route and set no session', async () => {
  mocked.open.mockResolvedValue({ status: 'rejected' })
  const response = await GET(new Request(`https://near.example/auth/callback?code=test-code&state=${STATE}`))
  expect(response.headers.get('location')).toBe('https://near.example/login?error=auth&next=%2Fme%2Flibraries')
  expect(setCookies(response).some((c) => c.startsWith('nb_at=') || c.startsWith('nb_rt='))).toBe(false)
})
