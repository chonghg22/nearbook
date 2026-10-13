import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as inBounds } from './libraries/in-bounds/route'
import { GET as regionCenter } from './libraries/region-center/route'
import { GET as byRegion } from './libraries/by-region/route'
import { POST as analytics } from './analytics/event/route'

vi.mock('@/lib/server-api', () => ({ SERVER_API_BASE_URL: 'https://upstream.example' }))

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '/api')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
})
afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('Route Handlers use absolute server upstream, not browser /api', () => {
  const rows = [
    { id: 1, name: '해운대도서관', address: '부산광역시 해운대구', lat: 35, lng: 129 },
    { id: 2, name: '반여도서관', lat: 35.5, lng: 129.5 },
  ]
  const boundsUrl = 'https://www.near-book.com/api/libraries/in-bounds?swLat=37&swLng=126&neLat=38&neLng=127'

  it('in-bounds preserves parameters and returns validated rows', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ data: rows }))
    const response = await inBounds(new NextRequest(boundsUrl))
    expect(fetchMock).toHaveBeenCalledWith('https://upstream.example/libraries/in-bounds?swLat=37&swLng=126&neLat=38&neLng=127&limit=100', expect.objectContaining({ cache: 'no-store' }))
    expect(await response.json()).toEqual({ data: [rows[0], { ...rows[1], address: '' }] })
  })
  it('in-bounds rejects invalid input without calling upstream', async () => {
    for (const query of [
      'swLat=37&swLng=126&neLat=38',
      'swLat=&swLng=126&neLat=38&neLng=127',
      'swLat=abc&swLng=126&neLat=38&neLng=127',
      'swLat=91&swLng=126&neLat=38&neLng=127',
      'swLat=38&swLng=126&neLat=37&neLng=127',
      'swLat=37&swLng=126&neLat=38&neLng=127&limit=1000',
    ]) {
      const response = await inBounds(new NextRequest(`https://www.near-book.com/api/libraries/in-bounds?${query}`))
      expect(response.status).toBe(400)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('in-bounds sanitizes upstream errors', async () => {
    fetchMock.mockResolvedValueOnce(new Response('SECRET upstream body', { status: 403 }))
    const response = await inBounds(new NextRequest(boundsUrl))
    expect(response.status).toBe(502)
    expect(await response.text()).not.toMatch(/SECRET|upstream\.example/)
  })
  it('in-bounds keeps 429 and reports a malformed non-empty list as an error, not []', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }))
    expect((await inBounds(new NextRequest(boundsUrl))).status).toBe(429)
    fetchMock.mockResolvedValueOnce(Response.json({ data: [{ id: 1, name: 'x', lat: null, lng: 127 }] }))
    const response = await inBounds(new NextRequest(boundsUrl))
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: 'upstream_unavailable', kind: 'invalid-response' })
  })
  it('region-center uses upstream and averages coordinates', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ data: [{ id: 1, name: 'A', lat: 37, lng: 126 }, { id: 2, name: 'B', lat: 38, lng: 127 }] }))
    const params = new URLSearchParams({ sido: '서울', sigungu: '중구' })
    const response = await regionCenter(new NextRequest(`https://www.near-book.com/api/libraries/region-center?${params}`))
    expect(fetchMock).toHaveBeenCalledWith(`https://upstream.example/libraries/by-region?${params}`, expect.objectContaining({ cache: 'no-store' }))
    expect(await response.json()).toEqual({ lat: 37.5, lng: 126.5, zoom: 13 })
  })
  it('by-region returns rows, center and limited from the existing API', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ data: rows }))
    const params = new URLSearchParams({ sido: '부산광역시', sigungu: '해운대구' })
    const response = await byRegion(new NextRequest(`https://www.near-book.com/api/libraries/by-region?${params}`))
    expect(fetchMock).toHaveBeenCalledWith(`https://upstream.example/libraries/by-region?${params}`, expect.objectContaining({ cache: 'no-store' }))
    expect(await response.json()).toEqual({
      data: [rows[0], { ...rows[1], address: '' }],
      center: { lat: 35.25, lng: 129.25, zoom: 13 },
      limited: false,
    })
  })
  it('by-region keeps a valid empty region distinct from errors', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ data: [] }))
    const ok = await byRegion(new NextRequest('https://www.near-book.com/api/libraries/by-region?sido=%EC%84%B8%EC%A2%85'))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ data: [], center: null, limited: false })
    fetchMock.mockResolvedValueOnce(Response.json({ data: [{ id: 1, name: 'x', lat: '', lng: 127 }] }))
    const bad = await byRegion(new NextRequest('https://www.near-book.com/api/libraries/by-region?sido=%EC%84%B8%EC%A2%85'))
    expect(bad.status).toBe(502)
    fetchMock.mockResolvedValueOnce(new Response('SECRET', { status: 500 }))
    const failed = await byRegion(new NextRequest('https://www.near-book.com/api/libraries/by-region?sido=%EC%84%B8%EC%A2%85'))
    expect(failed.status).toBe(502)
    expect(await failed.text()).not.toMatch(/SECRET/)
  })
  it('by-region validates region input', async () => {
    for (const query of ['', 'sigungu=%ED%95%B4%EC%9A%B4%EB%8C%80%EA%B5%AC', 'sido=%25', 'sido=%EB%B6%80%EC%82%B0&sigungu=_']) {
      const response = await byRegion(new NextRequest(`https://www.near-book.com/api/libraries/by-region?${query}`))
      expect(response.status).toBe(400)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('analytics forwards to server upstream even without public URL settings', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '')
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }))
    const body = { name: 'search_submit', payload: { query: 'test' } }
    const response = await analytics(new NextRequest('https://www.near-book.com/api/analytics/event', { method: 'POST', body: JSON.stringify(body) }))
    expect(fetchMock).toHaveBeenCalledWith('https://upstream.example/analytics/event', expect.objectContaining({ method: 'POST', body: JSON.stringify(body), cache: 'no-store' }))
    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ ok: true })
  })
})
