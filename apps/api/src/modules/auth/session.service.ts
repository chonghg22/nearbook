import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { createHash, randomBytes, randomUUID } from 'crypto'
import { db, users, authIdentities, authSessions, eq, and, isNull, gt } from '@nearbook/db'

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60
export const REFRESH_IDLE_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const REFRESH_ABSOLUTE_TTL_MS = 90 * 24 * 60 * 60 * 1000
export const JWT_ISSUER = 'nearbook-api'
export const JWT_AUDIENCE = 'nearbook'

export interface AccessTokenClaims {
  sub: string
  sid: string
  prv: string
  nick?: string
}

export interface SessionUser {
  id: string
  nickname: string | null
  provider: string
}

export interface IssuedSession {
  accessToken: string
  accessTokenExpiresAt: number
  refreshToken?: string
  refreshTokenExpiresAt: number
  user: SessionUser
}

export function hashRefreshToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

function nextExpiry(createdAt: Date, now = Date.now()) {
  return new Date(Math.min(now + REFRESH_IDLE_TTL_MS, createdAt.getTime() + REFRESH_ABSOLUTE_TTL_MS))
}

class IdentityRace extends Error {}

/** Nearbook-issued sessions: short HS256 access JWT + opaque refresh token (hash stored). */
@Injectable()
export class SessionService {
  constructor(private readonly jwt: JwtService) {}

  private async accessToken(user: { supabaseUserId: string; nickname: string | null }, sid: string, provider: string) {
    const claims: AccessTokenClaims = { sub: user.supabaseUserId, sid, prv: provider }
    if (user.nickname) claims.nick = user.nickname
    const accessToken = await this.jwt.signAsync(claims, {
      algorithm: 'HS256',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })
    return { accessToken, accessTokenExpiresAt: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS }
  }

  /** Find or create the local user for a verified provider identity and open a session. */
  async signIn(provider: string, providerUserId: string, nickname: string | undefined, userAgent?: string): Promise<IssuedSession> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.signInOnce(provider, providerUserId, nickname, userAgent)
      } catch (error) {
        // A concurrent first sign-in of the same account won the identity insert; retry once to reuse it.
        if (error instanceof IdentityRace && attempt === 0) continue
        throw error
      }
    }
  }

  private async signInOnce(provider: string, providerUserId: string, nickname: string | undefined, userAgent?: string) {
    const refreshToken = randomBytes(32).toString('base64url')
    const now = new Date()
    const expiresAt = nextExpiry(now, now.getTime())

    const { user, sid } = await db.transaction(async (tx) => {
      const [identity] = await tx
        .select()
        .from(authIdentities)
        .where(and(eq(authIdentities.provider, provider), eq(authIdentities.providerUserId, providerUserId)))
        .for('update')

      let user: typeof users.$inferSelect | undefined
      if (identity) {
        ;[user] = await tx.select().from(users).where(eq(users.id, identity.userId))
        if (!user) throw new Error('Identity has no user')
        await tx.update(authIdentities).set({ lastSignInAt: now }).where(eq(authIdentities.id, identity.id))
        if (!user.nickname && nickname) {
          ;[user] = await tx.update(users).set({ nickname, updatedAt: now }).where(eq(users.id, user.id)).returning()
        }
      } else {
        ;[user] = await tx.insert(users).values({ supabaseUserId: randomUUID(), nickname: nickname ?? null }).returning()
        const linked = await tx
          .insert(authIdentities)
          .values({ userId: user.id, provider, providerUserId })
          .onConflictDoNothing({ target: [authIdentities.provider, authIdentities.providerUserId] })
          .returning({ id: authIdentities.id })
        if (linked.length === 0) throw new IdentityRace()
      }

      const [session] = await tx
        .insert(authSessions)
        .values({
          userId: user.id,
          refreshTokenHash: hashRefreshToken(refreshToken),
          provider,
          userAgent: userAgent?.slice(0, 256) ?? null,
          expiresAt,
        })
        .returning({ id: authSessions.id })
      return { user, sid: session.id }
    })

    const access = await this.accessToken(user, sid, provider)
    return {
      ...access,
      refreshToken,
      refreshTokenExpiresAt: Math.floor(expiresAt.getTime() / 1000),
      user: { id: user.supabaseUserId, nickname: user.nickname, provider },
    }
  }

  /** Sliding refresh without rotation, so concurrent tabs/requests never invalidate each other. */
  async refresh(refreshToken: string): Promise<IssuedSession | null> {
    const now = new Date()
    const [row] = await db
      .select({ session: authSessions, user: users })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(and(
        eq(authSessions.refreshTokenHash, hashRefreshToken(refreshToken)),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, now),
      ))
    if (!row) return null

    const expiresAt = nextExpiry(row.session.createdAt, now.getTime())
    await db.update(authSessions).set({ lastUsedAt: now, expiresAt }).where(eq(authSessions.id, row.session.id))
    const access = await this.accessToken(row.user, row.session.id, row.session.provider)
    return {
      ...access,
      refreshTokenExpiresAt: Math.floor(expiresAt.getTime() / 1000),
      user: { id: row.user.supabaseUserId, nickname: row.user.nickname, provider: row.session.provider },
    }
  }

  async revoke(refreshToken: string) {
    await db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.refreshTokenHash, hashRefreshToken(refreshToken)), isNull(authSessions.revokedAt)))
  }

  async verify(token: string): Promise<AccessTokenClaims | null> {
    try {
      const claims = await this.jwt.verifyAsync<AccessTokenClaims>(token, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      })
      return typeof claims.sub === 'string' && claims.sub && typeof claims.sid === 'string' ? claims : null
    } catch {
      return null
    }
  }
}
