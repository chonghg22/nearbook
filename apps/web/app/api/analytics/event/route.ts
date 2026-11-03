import { NextRequest, NextResponse } from 'next/server'
import { SERVER_API_BASE_URL } from '@/lib/server-api'

export const runtime = 'nodejs'

async function getAccessToken() {
  try {
    const { getServerSession } = await import('@/lib/auth/server')
    return (await getServerSession())?.access_token ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const accessToken = await getAccessToken()
    const res = await fetch(`${SERVER_API_BASE_URL}/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ ok: false }, { status: 202 })
    }

    return NextResponse.json({ ok: true }, { status: 202 })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
