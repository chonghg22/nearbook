// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { __resetAuthClientForTests, createClient, type AuthSession } from './client'

const session = (id: string, expires = Math.floor(Date.now() / 1000) + 600): AuthSession => ({
  access_token: `token-${id}`,
  expires_at: expires,
  user: { id, app_metadata: { provider: 'kakao' }, user_metadata: { nickname: id } },
})
const fetchMock = vi.fn()
beforeEach(() => {
  __resetAuthClientForTests()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())
const reply = (value: AuthSession | null) => Promise.resolve(new Response(JSON.stringify({ session: value })))

it('reads the session once through the same-origin route and reuses it until near expiry', async () => {
  fetchMock.mockImplementation(() => reply(session('a')))
  const auth = createClient().auth
  const [one, two] = await Promise.all([auth.getSession(), auth.getSession()])
  expect(one.data.session?.access_token).toBe('token-a')
  expect(two.data.session?.user.id).toBe('a')
  await auth.getUser()
  expect(fetchMock).toHaveBeenCalledOnce()
  expect(fetchMock.mock.calls[0]![0]).toBe('/auth-api/session')
})

it('emits the initial session and SIGNED_OUT after signOut revokes the server session', async () => {
  fetchMock.mockImplementationOnce(() => reply(session('a'))).mockImplementation(() => Promise.resolve(new Response('{}')))
  const auth = createClient().auth
  const events: [string, string | null][] = []
  const { data } = auth.onAuthStateChange((event, s) => events.push([event, s?.user.id ?? null]))
  await vi.waitFor(() => expect(events).toEqual([['INITIAL_SESSION', 'a']]))
  await auth.signOut()
  expect(fetchMock).toHaveBeenLastCalledWith('/auth-api/logout', expect.objectContaining({ method: 'POST' }))
  expect(events.at(-1)).toEqual(['SIGNED_OUT', null])
  data.subscription.unsubscribe()
})

it('an account change on revalidation is announced to listeners', async () => {
  fetchMock.mockImplementationOnce(() => reply(session('a', Math.floor(Date.now() / 1000) + 5)))
    .mockImplementationOnce(() => reply(session('b')))
  const auth = createClient().auth
  const events: [string, string | null][] = []
  auth.onAuthStateChange((event, s) => events.push([event, s?.user.id ?? null]))
  await vi.waitFor(() => expect(events).toHaveLength(1))
  await auth.getSession() // nearly expired → reload, now user b
  expect(events.at(-1)).toEqual(['SIGNED_IN', 'b'])
})

it('a network failure keeps the last known session instead of looking like a logout', async () => {
  fetchMock.mockImplementationOnce(() => reply(session('a', Math.floor(Date.now() / 1000) + 5)))
    .mockImplementationOnce(() => Promise.reject(new Error('offline')))
  const auth = createClient().auth
  await auth.getSession()
  await expect(auth.getSession()).resolves.toMatchObject({ data: { session: { user: { id: 'a' } } } })
})
