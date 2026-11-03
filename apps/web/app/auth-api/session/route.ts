import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

/** Same-origin session read for client components; middleware has already refreshed the cookie. */
export async function GET() {
  const session = await getServerSession()
  return NextResponse.json(
    { session },
    { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } },
  )
}
