import { NextRequest, NextResponse } from 'next/server'
import { SERVER_API_BASE_URL } from '@/lib/server-api'
import {
  MAX_LIBRARY_ROWS,
  computeRegionCenter,
  fetchJson,
  parseLibraryList,
  parseRegionParams,
  proxyError,
} from '@/lib/map-libraries.mjs'

const API_URL = SERVER_API_BASE_URL

/**
 * 지역 목록과 지도 중심을 한 번에 돌려준다. 기존 API는 최대 200건이므로 상한에 닿으면
 * limited로 알려 전체 건수처럼 보이지 않게 한다.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const region = parseRegionParams(searchParams.get('sido'), searchParams.get('sigungu'))
  if (!region) {
    return NextResponse.json({ error: 'invalid_region' }, { status: 400 })
  }

  const params = new URLSearchParams({ sido: region.sido })
  if (region.sigungu) params.append('sigungu', region.sigungu)

  try {
    const data = parseLibraryList(await fetchJson(`${API_URL}/libraries/by-region?${params}`))
    return NextResponse.json({
      data,
      center: computeRegionCenter(data, region.sigungu),
      limited: data.length >= MAX_LIBRARY_ROWS,
    })
  } catch (error) {
    const { status, body } = proxyError(error)
    console.error('[by-region proxy]', body.kind)
    return NextResponse.json(body, { status })
  }
}
