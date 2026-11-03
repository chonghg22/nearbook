import { afterEach, expect, it, vi } from 'vitest'
import { GET } from './route'

afterEach(() => vi.unstubAllEnvs())

it('redirects to Kakao with a fresh state bound to an httpOnly cookie and the safe return path', async () => {
  vi.stubEnv('KAKAO_REST_API_KEY', 'rest-key')
  const response = await GET(new Request('https://near.example/auth/kakao?next=%2Fbook%2F123'))
  const target = new URL(response.headers.get('location')!)
  expect(target.origin + target.pathname).toBe('https://kauth.kakao.com/oauth/authorize')
  expect(target.searchParams.get('client_id')).toBe('rest-key')
  expect(target.searchParams.get('redirect_uri')).toBe('https://near.example/auth/callback')
  expect(target.searchParams.get('scope')).toBe('profile_nickname')
  const state = target.searchParams.get('state')!
  expect(state).toMatch(/^[A-Za-z0-9_-]{32}$/)
  const cookie = response.headers.getSetCookie().find((c) => c.startsWith('nb_oauth='))!
  expect(cookie).toMatch(/HttpOnly/i)
  expect(cookie).toMatch(/Path=\/auth/)
  expect(JSON.parse(decodeURIComponent(cookie.split(';')[0]!.slice('nb_oauth='.length)))).toEqual({ state, next: '/book/123' })
})

it('an unconfigured login and an unsafe next fall back to the safe retry page', async () => {
  vi.stubEnv('KAKAO_REST_API_KEY', '')
  const response = await GET(new Request('https://near.example/auth/kakao?next=https://evil.example'))
  expect(response.headers.get('location')).toBe('https://near.example/login?error=auth&next=%2F')
})

it('builds redirects from the public host rather than the internal server URL', async () => {
  vi.stubEnv('KAKAO_REST_API_KEY', 'rest-key')
  const response = await GET(new Request('http://localhost:3100/auth/kakao', { headers: { host: '127.0.0.1:3100' } }))
  expect(new URL(response.headers.get('location')!).searchParams.get('redirect_uri')).toBe('http://127.0.0.1:3100/auth/callback')
  expect(response.headers.getSetCookie().find((c) => c.startsWith('nb_oauth='))).not.toMatch(/Secure/i)
  const forwarded = await GET(new Request('http://internal/auth/kakao', { headers: { 'x-forwarded-host': 'www.near-book.com', 'x-forwarded-proto': 'https' } }))
  expect(new URL(forwarded.headers.get('location')!).searchParams.get('redirect_uri')).toBe('https://www.near-book.com/auth/callback')
})
