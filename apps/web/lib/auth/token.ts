// Server/Edge-only. Verifies Nearbook API access tokens (HS256) with Web Crypto, no extra dependency.
export const JWT_ISSUER = 'nearbook-api'
export const JWT_AUDIENCE = 'nearbook'

export interface AccessClaims {
  sub: string
  sid: string
  prv: string
  nick?: string
  exp: number
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function decodeJson(segment: string): unknown {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment)))
}

const keys = new Map<string, Promise<CryptoKey>>()
function hmacKey(secret: string) {
  let key = keys.get(secret)
  if (!key) {
    key = crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    keys.set(secret, key)
  }
  return key
}

/** Returns claims only for a correctly signed, unexpired Nearbook token. `leewaySeconds` > 0 demands extra remaining life. */
export async function verifyAccessToken(
  token: string | undefined,
  secret: string | undefined,
  { nowSeconds = Math.floor(Date.now() / 1000), minRemainingSeconds = 0 } = {},
): Promise<AccessClaims | null> {
  if (!token || !secret || secret.length < 32) return null
  const parts = token.split('.')
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return null
  const [headerPart = '', payloadPart = '', signaturePart = ''] = parts
  try {
    const header = decodeJson(headerPart) as { alg?: unknown; typ?: unknown }
    if (header.alg !== 'HS256') return null
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      base64UrlToBytes(signaturePart),
      new TextEncoder().encode(`${headerPart}.${payloadPart}`),
    )
    if (!valid) return null
    const claims = decodeJson(payloadPart) as Record<string, unknown>
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
    if (claims.iss !== JWT_ISSUER || !audience.includes(JWT_AUDIENCE)) return null
    if (typeof claims.exp !== 'number' || claims.exp <= nowSeconds + minRemainingSeconds) return null
    if (typeof claims.sub !== 'string' || !claims.sub || typeof claims.sid !== 'string') return null
    return {
      sub: claims.sub,
      sid: claims.sid,
      prv: typeof claims.prv === 'string' ? claims.prv : 'unknown',
      ...(typeof claims.nick === 'string' ? { nick: claims.nick } : {}),
      exp: claims.exp,
    }
  } catch {
    return null
  }
}
