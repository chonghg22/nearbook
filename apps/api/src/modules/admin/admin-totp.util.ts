import { createHmac, randomBytes } from 'crypto'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(buffer: Buffer) {
  let bits = ''
  let output = ''

  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0')
  }

  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, '0')
    output += ALPHABET[Number.parseInt(chunk, 2)] ?? ''
  }

  return output
}

function base32Decode(input: string) {
  const cleaned = input.replace(/=+$/g, '').toUpperCase()
  let bits = ''

  for (const character of cleaned) {
    const value = ALPHABET.indexOf(character)
    if (value < 0) throw new Error('Invalid base32 character')
    bits += value.toString(2).padStart(5, '0')
  }

  const bytes: number[] = []
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2))
  }

  return Buffer.from(bytes)
}

function generateTotp(secret: string, stepOffset = 0, digits = 6, period = 30) {
  const counter = Math.floor(Date.now() / 1000 / period) + stepOffset
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  counterBuffer.writeUInt32BE(counter % 0x100000000, 4)

  const hmac = createHmac('sha1', base32Decode(secret)).update(counterBuffer).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  return String(code % (10 ** digits)).padStart(digits, '0')
}

export function generateBase32Secret(length = 20) {
  return base32Encode(randomBytes(length))
}

export function verifyTotpCode(secret: string, code: string, window = 1) {
  const normalizedCode = code.replace(/\s+/g, '')
  for (let offset = -window; offset <= window; offset += 1) {
    if (generateTotp(secret, offset) === normalizedCode) {
      return true
    }
  }
  return false
}

export function buildOtpAuthUri(email: string, secret: string) {
  const issuer = 'NearBook Admin'
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}
