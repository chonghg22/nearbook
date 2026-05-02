import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const w = searchParams.get('w') || '600'
  const h = searchParams.get('h') || '400'
  const level = searchParams.get('level') || '15'

  if (!lat || !lng) {
    return new NextResponse('lat, lng required', { status: 400 })
  }

  const params = new URLSearchParams({
    w,
    h,
    center: `${lng},${lat}`,
    level,
    markers: `type:t|pos:${lng} ${lat}|color:red`,
  })

  const naverUrl = `https://maps.apigw.ntruss.com/map-static/v2/raster?${params.toString()}`

  try {
    const response = await fetch(naverUrl, {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': process.env.NAVER_MAP_CLIENT_ID!,
        'X-NCP-APIGW-API-KEY': process.env.NAVER_MAP_CLIENT_SECRET!,
      },
    })

    if (!response.ok) {
      console.error('Naver Static Map error:', response.status, await response.text())
      return new NextResponse('Map fetch failed', { status: response.status })
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=2592000, s-maxage=2592000',
      },
    })
  } catch (err) {
    console.error('Static map proxy error:', err)
    return new NextResponse('Map error', { status: 500 })
  }
}
