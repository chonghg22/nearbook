import { createHmac } from 'node:crypto'
import { expect, it } from 'vitest'
import { verifyAccessToken } from './token'

const secret = 'isolated-unit-secret-0123456789abcdef'
const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
function sign(payload: Record<string, unknown>, { key = secret, header = { alg: 'HS256', typ: 'JWT' } } = {}) {
  const unsigned = `${b64(header)}.${b64(payload)}`
  return `${unsigned}.${createHmac('sha256', key).update(unsigned).digest('base64url')}`
}
const now = Math.floor(Date.now() / 1000)
const valid = { sub: 'subject', sid: 'sid', prv: 'kakao', nick: '독자', iss: 'nearbook-api', aud: 'nearbook', exp: now + 600 }

it('accepts a correctly signed Nearbook API token (same format as @nestjs/jwt HS256)', async () => {
  await expect(verifyAccessToken(sign(valid), secret)).resolves.toEqual({ sub: 'subject', sid: 'sid', prv: 'kakao', nick: '독자', exp: now + 600 })
})

it('rejects other secrets, algorithms, issuers, audiences, tampering and expiry', async () => {
  expect(await verifyAccessToken(sign(valid, { key: 'another-secret-0123456789abcdefgh' }), secret)).toBeNull()
  expect(await verifyAccessToken(sign(valid, { header: { alg: 'none', typ: 'JWT' } }), secret)).toBeNull()
  expect(await verifyAccessToken(sign({ ...valid, iss: 'supabase' }), secret)).toBeNull()
  expect(await verifyAccessToken(sign({ ...valid, aud: 'authenticated' }), secret)).toBeNull()
  expect(await verifyAccessToken(sign({ ...valid, exp: now - 1 }), secret)).toBeNull()
  const [h, , s] = sign(valid).split('.')
  expect(await verifyAccessToken(`${h}.${b64({ ...valid, sub: 'someone-else' })}.${s}`, secret)).toBeNull()
  expect(await verifyAccessToken('garbage', secret)).toBeNull()
})

it('requires a configured strong secret and can demand remaining lifetime', async () => {
  expect(await verifyAccessToken(sign(valid), undefined)).toBeNull()
  expect(await verifyAccessToken(sign(valid), 'short')).toBeNull()
  expect(await verifyAccessToken(sign(valid), secret, { minRemainingSeconds: 3600 })).toBeNull()
})
