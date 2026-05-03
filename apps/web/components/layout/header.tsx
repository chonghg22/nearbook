import { createServerClient } from '@/lib/supabase/server'
import { HeaderClient } from './header-client'

export async function Header() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const nickname =
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split('@')[0]

  return <HeaderClient nickname={nickname} />
}
