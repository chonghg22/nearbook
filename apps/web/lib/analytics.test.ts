// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  sessionStorage.clear()
  history.replaceState({}, '', '/?source=bookclub')
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 202 }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
const sent = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))
it('creates one visit per sliding session across concurrent effects with v2 identities', async () => {
  const { trackEvent } = await import('./analytics')
  await Promise.all([trackEvent('page_view'), trackEvent('book_detail_view', { isbn: '123' })])
  expect(sent().map((r) => r.type)).toEqual(['visit', 'page_view', 'book_detail_view'])
  expect(new Set(sent().map((r) => r.sessionId)).size).toBe(1)
  expect(new Set(sent().map((r) => r.payload.eventId)).size).toBe(3)
  for (const r of sent())
    expect(r.payload).toMatchObject({
      schemaVersion: 2,
      trafficSource: 'bookclub',
      clientTimeMs: expect.any(Number),
    })
  expect(sent()[0].payload.anonymousId).toBe(sent()[2].payload.anonymousId)
  vi.resetModules()
  await (await import('./analytics')).trackEvent('page_view')
  expect(sent().filter((r) => r.type === 'visit')).toHaveLength(1)
})
it('starts a new visit after idle timeout without inheriting an old campaign', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-20T00:00:00Z'))
  const { trackEvent } = await import('./analytics')
  await trackEvent('page_view')
  const previous = sent()[0]
  history.replaceState({}, '', '/search')
  vi.setSystemTime(Date.now() + 31 * 60000)
  await trackEvent('search_submit')
  const visits = sent().filter((r) => r.type === 'visit')
  expect(visits).toHaveLength(2)
  expect(visits[1].sessionId).not.toBe(previous.sessionId)
  expect(visits[1].payload.anonymousId).toBe(previous.payload.anonymousId)
  expect(visits[1].payload.trafficSource).toBeUndefined()
})
it('keeps storage/network failures outside the user flow with no transport retry', async () => {
  const { trackEvent } = await import('./analytics')
  fetchMock.mockRejectedValue(new Error('network'))
  await expect(trackEvent('page_view')).resolves.toBeUndefined()
  expect(fetchMock).toHaveBeenCalledTimes(2)
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('denied')
  })
  await expect(trackEvent('search_submit')).resolves.toBeUndefined()
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
it('does not turn a private route event into a public visit', async () => {
  history.replaceState({}, '', '/me/wishlist')
  await (await import('./analytics')).trackEvent('wishlist_add', { isbn: '123' })
  expect(sent().map((r) => r.type)).toEqual(['wishlist_add'])
})
