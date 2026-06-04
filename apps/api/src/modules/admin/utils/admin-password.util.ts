import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(_scrypt)

export async function hashAdminPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await scrypt(password, salt, 64) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

export async function verifyAdminPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(':')
  if (!salt || !key) return false

  const derivedKey = await scrypt(password, salt, 64) as Buffer
  const storedKey = Buffer.from(key, 'hex')

  if (storedKey.length !== derivedKey.length) return false
  return timingSafeEqual(storedKey, derivedKey)
}
