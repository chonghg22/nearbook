import { NextRequest, NextResponse } from 'next/server'
import { SERVER_API_BASE_URL } from '@/lib/server-api'
import { fetchJson, parseBoundsParams, parseLibraryList, parseLimit, proxyError } from '@/lib/map-libraries.mjs'

const API_URL = SERVER_API_BASE_URL

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const bounds = parseBoundsParams(searchParams)
  const limit = parseLimit(searchParams.get('limit'))

  if (!bounds || limit === null) {
    return NextResponse.json({ error: 'invalid_bounds' }, { status: 400 })
  }

  const params = new URLSearchParams({
    swLat: String(bounds.swLat),
    swLng: String(bounds.swLng),
    neLat: String(bounds.neLat),
    neLng: String(bounds.neLng),
    limit: String(limit),
  })

  try {
    const data = parseLibraryList(await fetchJson(`${API_URL}/libraries/in-bounds?${params}`))
    return NextResponse.json({ data })
  } catch (error) {
    const { status, body } = proxyError(error)
    console.error('[in-bounds proxy]', body.kind)
    return NextResponse.json(body, { status })
  }
}
