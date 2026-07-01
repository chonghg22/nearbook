import { NextRequest, NextResponse } from 'next/server'
import { PUBLIC_API_BASE_URL } from '@/lib/constants'

const API_URL = PUBLIC_API_BASE_URL

export async function GET(req: NextRequest) {
  const sido = req.nextUrl.searchParams.get('sido') ?? ''
  const sigungu = req.nextUrl.searchParams.get('sigungu') ?? ''

  if (!sido) {
    return NextResponse.json({ error: 'sido required' }, { status: 400 })
  }

  const params = new URLSearchParams({ sido })
  if (sigungu) params.append('sigungu', sigungu)

  try {
    const res = await fetch(`${API_URL}/libraries/by-region?${params}`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    const data = await res.json()

    const libs: { lat: number; lng: number }[] = data.data ?? []
    if (libs.length === 0) {
      return NextResponse.json({ lat: null, lng: null })
    }

    const lat = libs.reduce((s, l) => s + l.lat, 0) / libs.length
    const lng = libs.reduce((s, l) => s + l.lng, 0) / libs.length
    const zoom = sigungu ? 13 : 11

    return NextResponse.json({ lat, lng, zoom })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
