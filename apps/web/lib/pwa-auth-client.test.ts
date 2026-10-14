import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { apiFetch, authFetch } from './api-client'

vi.mock('@/lib/constants', () => ({ PUBLIC_API_BASE_URL: '/api' }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: {
  getSession: async () => ({ data: { session: { access_token: 'test-token' } } }),
} }) }))
const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockResolvedValue(new Response('{}')) })
afterEach(() => { vi.unstubAllGlobals(); fetchMock.mockReset() })

it('authenticated API fetch always disables browser HTTP caching', async () => {
  await apiFetch('/me', { cache: 'force-cache' })
  expect(fetchMock).toHaveBeenCalledWith('/api/me', expect.objectContaining({ cache: 'no-store',
    headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) }))
})
it('auth route fetch keeps credentials but cannot override no-store', async () => {
  await authFetch('/auth-api/me', { cache: 'force-cache' })
  expect(fetchMock).toHaveBeenCalledWith('/auth-api/me', expect.objectContaining({ cache: 'no-store', credentials: 'include' }))
})
