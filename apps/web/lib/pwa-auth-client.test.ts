import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { apiFetch, authFetch, personalApiFetch } from './api-client'

vi.mock('@/lib/constants', () => ({ PUBLIC_API_BASE_URL: '/api' }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'test-token' } } }),
    },
  }),
}))
const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue(new Response('{}'))
})
afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

it('authenticated API fetch always disables browser HTTP caching', async () => {
  await apiFetch('/me', { cache: 'force-cache' })
  expect(fetchMock).toHaveBeenCalledWith('/api/me', expect.objectContaining({ cache: 'no-store' }))
  expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe(
    'Bearer test-token'
  )
})
it('auth route fetch keeps credentials but cannot override no-store', async () => {
  await authFetch('/auth-api/me', { cache: 'force-cache' })
  expect(fetchMock).toHaveBeenCalledWith(
    '/auth-api/me',
    expect.objectContaining({ cache: 'no-store', credentials: 'include' })
  )
})
it('personal flows always use the same-origin bearer/no-store path without changing CORS', async () => {
  await personalApiFetch('/me/wishlists', { cache: 'force-cache' })
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/me/wishlists',
    expect.objectContaining({ cache: 'no-store', credentials: 'include' })
  )
  expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe(
    'Bearer test-token'
  )
})
it('personal paths reject external and ambiguous targets before token transmission', async () => {
  await expect(personalApiFetch('//external.test/me')).rejects.toThrow()
  await expect(personalApiFetch('https://external.test/me')).rejects.toThrow()
  expect(fetchMock).not.toHaveBeenCalled()
})
