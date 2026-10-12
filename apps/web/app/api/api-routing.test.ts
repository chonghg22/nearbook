import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as inBounds } from './libraries/in-bounds/route'
import { GET as regionCenter } from './libraries/region-center/route'
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
  it('in-bounds preserves parameters and payload', async () => {
    const payload = { data: [{ id: 111314 }] }
    fetchMock.mockResolvedValueOnce(Response.json(payload))
    const response = await inBounds(new NextRequest('https://www.near-book.com/api/libraries/in-bounds?swLat=37&swLng=126&neLat=38&neLng=127'))
    expect(fetchMock).toHaveBeenCalledWith('https://upstream.example/libraries/in-bounds?swLat=37&swLng=126&neLat=38&neLng=127&limit=100', { cache: 'no-store' })
    expect(await response.json()).toEqual(payload)
  })
  it('in-bounds preserves upstream error status', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 403 }))
    const response = await inBounds(new NextRequest('https://www.near-book.com/api/libraries/in-bounds?swLat=37&swLng=126&neLat=38&neLng=127'))
    expect(response.status).toBe(403)
  })
  it('region-center uses upstream and averages coordinates', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ data: [{ lat: 37, lng: 126 }, { lat: 38, lng: 127 }] }))
    const params = new URLSearchParams({ sido: '서울', sigungu: '중구' })
    const response = await regionCenter(new NextRequest(`https://www.near-book.com/api/libraries/region-center?${params}`))
    expect(fetchMock).toHaveBeenCalledWith(`https://upstream.example/libraries/by-region?${params}`, { cache: 'no-store' })
    expect(await response.json()).toEqual({ lat: 37.5, lng: 126.5, zoom: 13 })
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
