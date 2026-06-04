import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

function getKey(secret: string) {
  return createHash('sha256').update(secret).digest()
}

export function encryptAdminSecret(value: string, secret: string) {
  const iv = randomBytes(12)
  const key = getKey(secret)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptAdminSecret(payload: string, secret: string) {
  const [ivRaw, tagRaw, encryptedRaw] = payload.split(':')
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error('Invalid encrypted payload')
  const iv = Buffer.from(ivRaw, 'base64')
  const tag = Buffer.from(tagRaw, 'base64')
  const encrypted = Buffer.from(encryptedRaw, 'base64')
  const key = getKey(secret)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
