import { beforeEach, expect, it, vi } from 'vitest'
import { GET } from './route'
const mocked = vi.hoisted(() => ({ exchange: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createRouteHandlerClient: async () => ({ auth: { exchangeCodeForSession: mocked.exchange } }),
}))
beforeEach(() => {
  mocked.exchange.mockReset()
  mocked.exchange.mockResolvedValue({ error: null })
})
it('successful mock OAuth returns to the requested internal setup page', async () => {
  const response = await GET(
    new Request('https://near.example/auth/callback?code=test-code&next=%2Fme%2Flibraries')
  )
  expect(response.headers.get('location')).toBe('https://near.example/me/libraries')
  expect(mocked.exchange).toHaveBeenCalledExactlyOnceWith('test-code')
})
it('an unsafe return route cannot redirect the authentication callback outside this origin', async () => {
  const response = await GET(
    new Request('https://near.example/auth/callback?code=test-code&next=%40evil.example')
  )
  expect(response.headers.get('location')).toBe('https://near.example/')
})
it('failed exchanges expose only the safe login retry route', async () => {
  mocked.exchange.mockRejectedValue(new Error('sensitive provider error'))
  const response = await GET(new Request('https://near.example/auth/callback?code=test-code'))
  expect(response.headers.get('location')).toBe('https://near.example/login?error=auth')
  expect(await response.text()).not.toContain('sensitive')
})
