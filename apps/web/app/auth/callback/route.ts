import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { safeReturnPath } from '@/lib/auth-return-path'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeReturnPath(searchParams.get('next'))

  if (code) {
    try {
      const response = NextResponse.redirect(`${origin}${next}`)
      const supabase = await createRouteHandlerClient(response)
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return response
      }
    } catch {
      /* Show a safe retry page, never provider credentials/errors. */
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
