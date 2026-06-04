export interface JwtPayload {
  sub: string
  email: string
  app_metadata: { provider: string }
  exp: number
  iat: number
}

export interface AuthUser {
  supabaseUserId: string
  email: string
  provider: string
}
