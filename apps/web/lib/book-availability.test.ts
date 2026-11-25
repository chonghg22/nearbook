import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BOOK_RETRY_AFTER_SECONDS,
  bookIsbnFromPath,
  bookUnavailableResponse,
  bookAvailability,
  isBookTemporarilyUnavailable,
} from './book-availability'

describe('bookIsbnFromPath', () => {
  it('extracts the ISBN from a book detail path only', () => {
    expect(bookIsbnFromPath('/book/9788936434120')).toBe('9788936434120')
    expect(bookIsbnFromPath('/book/9788936434120/')).toBe('9788936434120')
    expect(bookIsbnFromPath('/book')).toBeNull()
    expect(bookIsbnFromPath('/book/9788936434120/opengraph-image')).toBeNull()
    expect(bookIsbnFromPath('/library/111129')).toBeNull()
    expect(bookIsbnFromPath('/book/%E0%A4%A')).toBeNull()
  })
})

describe('isBookTemporarilyUnavailable', () => {
  beforeEach(() => {
    vi.stubEnv('INTERNAL_API_URL', 'http://nearbook-api:3001')
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.near-book.com')
  })
  afterEach(() => vi.unstubAllEnvs())

  const respond = (status: number) => vi.fn(async () => new Response('{}', { status })) as unknown as typeof fetch

  it.each([200, 404])('lets the page render on %i', async (status) => {
    expect(await isBookTemporarilyUnavailable('9788936434120', respond(status))).toBe(false)
  })

  it.each([429, 500, 503])('reports unavailable on %i', async (status) => {
    expect(await isBookTemporarilyUnavailable('9788936434120', respond(status))).toBe(true)
  })

  it('distinguishes an unacquired book and links to an explicit action without fetching in the page', async () => {
    expect(await bookAvailability('9788936434120', respond(409))).toBe('unacquired')
    const response = bookUnavailableResponse('9788936434120', 'unacquired')
    expect(response.status).toBe(503)
    expect(await response.text()).toContain('/book-request?isbn=9788936434120')
  })

  it('does not reflect arbitrary path text into the HTML action', async () => {
    expect(await bookUnavailableResponse('\"><script>alert(1)</script>', 'unacquired').text()).not.toContain('<script>')
  })

  it('reports unavailable when the API cannot be reached', async () => {
    const failing = vi.fn(async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof fetch
    expect(await isBookTemporarilyUnavailable('9788936434120', failing)).toBe(true)
  })

  it('requests the encoded ISBN from the internal API without caching', async () => {
    const fetchImpl = respond(200)
    await isBookTemporarilyUnavailable('978/../x', fetchImpl)
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://nearbook-api:3001/books/978%2F..%2Fx',
      expect.objectContaining({ cache: 'no-store' }),
    )
  })
})

describe('bookUnavailableResponse', () => {
  it('answers 503 with Retry-After and is never cached', () => {
    const response = bookUnavailableResponse()
    expect(response.status).toBe(503)
    expect(response.headers.get('Retry-After')).toBe(String(BOOK_RETRY_AFTER_SECONDS))
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
})
