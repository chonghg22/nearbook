import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

async function getAccessToken() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

    if (!apiBase) {
      console.warn('[analytics] API base URL is not set, event skipped')
      return NextResponse.json({ ok: false, skipped: true, reason: 'missing_api_base_url' })
    }

    const accessToken = await getAccessToken()
    const res = await fetch(`${apiBase}/analytics/event`, {
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
