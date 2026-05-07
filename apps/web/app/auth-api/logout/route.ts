import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  const supabase = await createRouteHandlerClient(response)
  await supabase.auth.signOut()

  return response
}
