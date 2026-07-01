import { NextRequest, NextResponse } from 'next/server'
import { PUBLIC_API_BASE_URL } from '@/lib/constants'

const API_URL = PUBLIC_API_BASE_URL

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const swLat = searchParams.get('swLat')
  const swLng = searchParams.get('swLng')
  const neLat = searchParams.get('neLat')
  const neLng = searchParams.get('neLng')
  const limit = searchParams.get('limit') ?? '100'

  if (!swLat || !swLng || !neLat || !neLng) {
    return NextResponse.json({ error: 'bounds 파라미터 필요' }, { status: 400 })
  }

  try {
    const upstream = await fetch(
      `${API_URL}/libraries/in-bounds?swLat=${swLat}&swLng=${swLng}&neLat=${neLat}&neLng=${neLng}&limit=${limit}`,
      { cache: 'no-store' }
    )

    if (!upstream.ok) {
      return NextResponse.json({ error: 'upstream 오류' }, { status: upstream.status })
    }

    const data = await upstream.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[in-bounds proxy]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
