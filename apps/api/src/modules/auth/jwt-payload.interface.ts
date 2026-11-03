export interface AuthUser {
  supabaseUserId: string
  email: string
  provider: string
  nickname?: string
}
