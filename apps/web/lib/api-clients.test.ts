import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { publicApiJson } from './public-api-client'
import { authenticatedApiFetch, authFetch } from './api-client'
import { serverApiJson } from './server-api'
import { parseSearchResult } from './api-contracts'

const session = vi.hoisted(() => ({ get: vi.fn(), getUser: vi.fn() }))
vi.mock('./constants', () => ({ PUBLIC_API_BASE_URL: '/api' }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getSession: session.get, getUser: session.getUser } }) }))
const fetchMock = vi.fn<typeof fetch>()
const payload = { data: { items: [], total: 0, page: 1, pageSize: 10 } }
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock); fetchMock.mockResolvedValue(Response.json(payload))
  session.get.mockResolvedValue({ data: { session: { access_token: 'fake-test-token' } } })
})
afterEach(() => { vi.unstubAllGlobals(); fetchMock.mockReset(); session.get.mockReset(); session.getUser.mockReset() })

it('public search never reads/refreshes a session or attaches bearer headers', async () => {
  expect(await publicApiJson('/search?q=test', parseSearchResult, { headers: { Authorization: 'Bearer should-not-leak' } })).toEqual(payload)
  expect(session.get).not.toHaveBeenCalled(); expect(session.getUser).not.toHaveBeenCalled()
  expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).has('Authorization')).toBe(false)
  expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe('same-origin')
})
it('auth merges Headers objects and preserves body, method and no-store', async () => {
  await authenticatedApiFetch('/wishlists', { method: 'POST', body: '{}', headers: new Headers({ 'X-Test': 'kept' }) })
  const init = fetchMock.mock.calls[0]?.[1]
  expect(new Headers(init?.headers).get('X-Test')).toBe('kept')
  expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer fake-test-token')
  expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
  expect(init?.cache).toBe('no-store'); expect(init?.method).toBe('POST')
})
it('anonymous private request returns 401 with no getUser or API request', async () => {
  session.get.mockResolvedValue({ data: { session: null } })
  expect((await authenticatedApiFetch('/me')).status).toBe(401)
  expect(fetchMock).not.toHaveBeenCalled(); expect(session.getUser).not.toHaveBeenCalled()
})
it('does not replace browser multipart Content-Type with JSON', async () => {
  const body = new FormData()
  body.set('field', 'test')
  await authenticatedApiFetch('/test', { method: 'POST', body })
  expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).has('Content-Type')).toBe(false)
})
it('auth header acquisition is included in the deadline and cannot launch a late API request', async () => {
  let resolve!: (value: unknown) => void
  session.get.mockReturnValue(new Promise((r) => { resolve = r }))
  await expect(authenticatedApiFetch('/me', { timeoutMs: 10 })).rejects.toMatchObject({ kind: 'timeout' })
  resolve({ data: { session: { access_token: 'late' } } })
  await new Promise((r) => setTimeout(r, 0))
  expect(fetchMock).not.toHaveBeenCalled()
})
it('public upstream 503 is not a successful zero-result response', async () => {
  fetchMock.mockResolvedValueOnce(new Response('SECRET', { status: 503 }))
  await expect(publicApiJson('/search', parseSearchResult)).rejects.toMatchObject({ kind: 'http', status: 503 })
})
it('malformed public schema is a sanitized invalid-response error', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ data: { items: [] } }))
  await expect(publicApiJson('/search', parseSearchResult)).rejects.toMatchObject({ kind: 'invalid-response' })
})
it('server uses absolute upstream without any browser auth dependency', async () => {
  await serverApiJson('/search?q=test', parseSearchResult)
  expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/^https?:\/\//)
  expect(session.get).not.toHaveBeenCalled()
})
it('clients reject external/protocol-relative paths before session access or fetch', async () => {
  await expect(authenticatedApiFetch('//external.test')).rejects.toMatchObject({ kind: 'invalid-response' })
  await expect(authFetch('https://external.test/auth')).rejects.toMatchObject({ kind: 'invalid-response' })
  await expect(publicApiJson('//external.test', parseSearchResult)).rejects.toMatchObject({ kind: 'invalid-response' })
  expect(fetchMock).not.toHaveBeenCalled(); expect(session.get).not.toHaveBeenCalled()
})
