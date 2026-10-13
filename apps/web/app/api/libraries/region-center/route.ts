import { NextRequest, NextResponse } from 'next/server'
import { SERVER_API_BASE_URL } from '@/lib/server-api'
import { computeRegionCenter, fetchJson, parseLibraryList, parseRegionParams, proxyError } from '@/lib/map-libraries.mjs'

const API_URL = SERVER_API_BASE_URL

export async function GET(req: NextRequest) {
  const region = parseRegionParams(req.nextUrl.searchParams.get('sido'), req.nextUrl.searchParams.get('sigungu'))
  if (!region) {
    return NextResponse.json({ error: 'invalid_region' }, { status: 400 })
  }

  const params = new URLSearchParams({ sido: region.sido })
  if (region.sigungu) params.append('sigungu', region.sigungu)

  try {
    const data = parseLibraryList(await fetchJson(`${API_URL}/libraries/by-region?${params}`))
    // 유효한 빈 지역만 null 좌표다. 잘못된 응답은 위에서 오류로 처리된다.
    return NextResponse.json(computeRegionCenter(data, region.sigungu) ?? { lat: null, lng: null })
  } catch (error) {
    const { status, body } = proxyError(error)
    console.error('[region-center proxy]', body.kind)
    return NextResponse.json(body, { status })
  }
}
