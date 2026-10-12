import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./server-api', () => ({ SERVER_API_BASE_URL: 'https://upstream.example' }))

import { fetchBookDetail, fetchLibraryDetail, fetchOptionalDetail } from './detail-data'

afterEach(() => vi.unstubAllGlobals())

describe('detail data isolation', () => {
  it('uses metadata-only endpoint for a book (no holdings or affiliates)', async () => {
    const book = { isbn: '9791161571195', title: '불편한 편의점', author: '김호연' }
    const fetchMock = vi.fn().mockResolvedValue(Response.json(book))
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchBookDetail(book.isbn)).toEqual(book)
    expect(fetchMock).toHaveBeenCalledWith(`https://upstream.example/books/${book.isbn}`, expect.objectContaining({ cache: 'no-store' }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('unwraps library metadata', async () => {
    const library = { id: 111314, name: '서울도서관' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: library })))
    expect(await fetchLibraryDetail('111314')).toEqual(library)
  })

  for (const read of [() => fetchBookDetail('9791161571195'), () => fetchLibraryDetail('111314')]) {
    it('returns null only for upstream 404', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
      expect(await read()).toBeNull()
    })
    it('throws for 429, preserving the error path for page and metadata', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })))
      await expect(read()).rejects.toMatchObject({ kind: 'http', status: 429 })
    })
    it('rejects a malformed detail body rather than treating it as missing', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: {} })))
      await expect(read()).rejects.toMatchObject({ kind: 'invalid-response' })
    })
  }

  it('optional data failures do not affect basic book metadata', async () => {
    const book = { isbn: '9791161571195', title: '불편한 편의점' }
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => (
      url.endsWith('/analysis') ? new Response('', { status: 503 }) : Response.json(book)
    )))
    expect(await fetchBookDetail(book.isbn)).toEqual(book)
    expect(await fetchOptionalDetail(`/books/${book.isbn}/analysis`)).toBeNull()
  })

  it('keeps a valid empty supplementary result distinct from a failed read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: [] })))
    expect(await fetchOptionalDetail('/libraries/111314/popular')).toEqual([])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>error</html>')))
    expect(await fetchOptionalDetail('/libraries/111314/popular')).toBeNull()
  })
})
