import { JwtService } from '@nestjs/jwt'
import {
  SessionService,
  hashRefreshToken,
  ACCESS_TOKEN_TTL_SECONDS,
  JWT_AUDIENCE,
  JWT_ISSUER,
  REFRESH_ABSOLUTE_TTL_MS,
} from './session.service'

// A tiny drizzle-like chain recorder: every builder call returns the chain, awaiting resolves the next queued result.
jest.mock('@nearbook/db', () => {
  const results: unknown[][] = []
  const calls: { op: string; args: unknown[] }[] = []
  const chain: Record<string, unknown> = {}
  for (const op of ['select', 'from', 'where', 'for', 'update', 'set', 'insert', 'values', 'returning', 'onConflictDoNothing', 'innerJoin']) {
    chain[op] = (...args: unknown[]) => { calls.push({ op, args }); return chain }
  }
  chain.then = (resolve: (value: unknown) => void, reject: (error: unknown) => void) => {
    const next = results.shift()
    return Promise.resolve(next ?? []).then(resolve, reject)
  }
  const db = { ...chain, transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(chain)) }
  const column = (name: string) => ({ name })
  return {
    results,
    calls,
    db,
    users: { id: column('users.id'), $inferSelect: {} },
    authIdentities: { id: column('ai.id'), provider: column('ai.provider'), providerUserId: column('ai.pid'), userId: column('ai.user') },
    authSessions: { id: column('as.id'), userId: column('as.user'), refreshTokenHash: column('as.hash'), revokedAt: column('as.revoked'), expiresAt: column('as.exp') },
    eq: (...args: unknown[]) => ({ eq: args }),
    and: (...args: unknown[]) => ({ and: args }),
    isNull: (...args: unknown[]) => ({ isNull: args }),
    gt: (...args: unknown[]) => ({ gt: args }),
  }
})

const dbMock = jest.requireMock('@nearbook/db') as { results: unknown[][]; calls: { op: string; args: unknown[] }[] }
const secret = 'isolated-test-secret-0123456789abcdef'

describe('SessionService', () => {
  const jwt = new JwtService({ secret })
  const service = new SessionService(jwt)
  const user = { id: 8, supabaseUserId: 'existing-subject', nickname: '독자' }

  beforeEach(() => {
    dbMock.results.length = 0
    dbMock.calls.length = 0
  })

  it('reuses the linked user for a known Kakao identity and issues a verifiable access token', async () => {
    dbMock.results.push([{ id: 1, userId: 8 }], [user], [], [{ id: 'sid-1' }])
    const session = await service.signIn('kakao', '12345', '새닉네임', 'test-agent')

    expect(session.user).toEqual({ id: 'existing-subject', nickname: '독자', provider: 'kakao' })
    expect(session.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    const claims = await service.verify(session.accessToken)
    expect(claims).toMatchObject({ sub: 'existing-subject', sid: 'sid-1', prv: 'kakao', nick: '독자' })
    expect(session.accessTokenExpiresAt - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(ACCESS_TOKEN_TTL_SECONDS)
    // Only the hash of the refresh token is persisted.
    const stored = dbMock.calls.filter((c) => c.op === 'values').map((c) => c.args[0] as Record<string, unknown>)
    expect(stored.some((v) => v.refreshTokenHash === hashRefreshToken(session.refreshToken!))).toBe(true)
    expect(JSON.stringify(stored)).not.toContain(session.refreshToken)
  })

  it('creates a new user with a random internal subject for a first sign-in', async () => {
    dbMock.results.push([], [{ id: 70, supabaseUserId: 'new-subject', nickname: '처음' }], [{ id: 3 }], [{ id: 'sid-2' }])
    const session = await service.signIn('kakao', '999', '처음')
    expect(session.user.id).toBe('new-subject')
    const insertedUser = dbMock.calls.find((c) => c.op === 'values')?.args[0] as { supabaseUserId: string }
    expect(insertedUser.supabaseUserId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('retries once when a concurrent first sign-in linked the identity first', async () => {
    dbMock.results.push(
      [], [{ id: 71, supabaseUserId: 'loser', nickname: null }], [], // race: identity insert returned nothing
      [{ id: 2, userId: 72 }], [{ id: 72, supabaseUserId: 'winner', nickname: null }], [], [{ id: 'sid-3' }],
    )
    const session = await service.signIn('kakao', '555', undefined)
    expect(session.user.id).toBe('winner')
  })

  it('refreshes a live session without rotating the refresh token and caps the absolute lifetime', async () => {
    const createdAt = new Date(Date.now() - REFRESH_ABSOLUTE_TTL_MS + 60_000)
    dbMock.results.push([{ session: { id: 'sid-4', createdAt, provider: 'kakao' }, user }], [])
    const session = await service.refresh('a'.repeat(43))
    expect(session?.refreshToken).toBeUndefined()
    expect(session!.refreshTokenExpiresAt * 1000).toBeLessThanOrEqual(createdAt.getTime() + REFRESH_ABSOLUTE_TTL_MS)
    expect(await service.verify(session!.accessToken)).toMatchObject({ sid: 'sid-4', sub: 'existing-subject' })
  })

  it('rejects unknown, revoked or expired refresh tokens', async () => {
    dbMock.results.push([])
    await expect(service.refresh('b'.repeat(43))).resolves.toBeNull()
  })

  it('rejects tokens with a different secret, issuer, audience or that are expired', async () => {
    const claims = { sub: 's', sid: 'x', prv: 'kakao' }
    const other = new JwtService({ secret: 'another-secret-0123456789abcdefgh' })
    expect(await service.verify(await other.signAsync(claims, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE }))).toBeNull()
    expect(await service.verify(await jwt.signAsync(claims, { issuer: 'supabase', audience: JWT_AUDIENCE }))).toBeNull()
    expect(await service.verify(await jwt.signAsync(claims, { issuer: JWT_ISSUER, audience: 'authenticated' }))).toBeNull()
    expect(await service.verify(await jwt.signAsync(claims, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE, expiresIn: -1 }))).toBeNull()
    expect(await service.verify('not-a-jwt')).toBeNull()
  })
})
