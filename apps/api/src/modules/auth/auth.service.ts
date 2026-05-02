import { Injectable } from '@nestjs/common'
import { db, users, eq } from '@nearbook/db'

@Injectable()
export class AuthService {
  async getOrCreateUser(supabaseUserId: string, email?: string, nickname?: string) {
    const existing = await db.query.users.findFirst({
      where: eq(users.supabaseUserId, supabaseUserId),
    })
    if (existing) return existing

    const [created] = await db.insert(users).values({
      supabaseUserId,
      email: email ?? null,
      nickname: nickname ?? null,
    }).returning()

    return created
  }
}
