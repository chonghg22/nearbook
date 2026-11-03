import { cookies } from 'next/headers'
import { ACCESS_COOKIE } from './session-cookies'
import { verifyAccessToken } from './token'

export interface AuthUser {
  id: string
  email?: string
  app_metadata: { provider: string }
  user_metadata: { nickname?: string }
}

export interface AuthSession {
  access_token: string
  expires_at: number
  user: AuthUser
}

export async function sessionFromAccessToken(token: string | undefined): Promise<AuthSession | null> {
  const claims = await verifyAccessToken(token, process.env.AUTH_JWT_SECRET)
  if (!claims || !token) return null
  return {
    access_token: token,
    expires_at: claims.exp,
    user: {
      id: claims.sub,
      app_metadata: { provider: claims.prv },
      user_metadata: claims.nick ? { nickname: claims.nick } : {},
    },
  }
}

/** Middleware refreshes the access cookie first, so Server Components only verify it. */
export async function getServerSession(): Promise<AuthSession | null> {
  const store = await cookies()
  return sessionFromAccessToken(store.get(ACCESS_COOKIE)?.value)
}
