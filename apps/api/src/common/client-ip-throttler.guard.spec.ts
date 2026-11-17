import { cloudflareClientIp, isPrivatePeer } from './client-ip-throttler.guard'

describe('cloudflareClientIp', () => {
  it('returns the visitor IP set by Cloudflare', () => {
    expect(cloudflareClientIp({ headers: { 'cf-connecting-ip': '203.0.113.7' } })).toBe('203.0.113.7')
    expect(cloudflareClientIp({ headers: { 'cf-connecting-ip': ' 2001:db8::1 ' } })).toBe('2001:db8::1')
    expect(cloudflareClientIp({ headers: { 'cf-connecting-ip': ['198.51.100.2', '10.0.0.1'] } })).toBe('198.51.100.2')
  })

  it('ignores a missing or malformed header', () => {
    expect(cloudflareClientIp({ headers: {} })).toBeNull()
    expect(cloudflareClientIp({})).toBeNull()
    expect(cloudflareClientIp({ headers: { 'cf-connecting-ip': 'not-an-ip' } })).toBeNull()
    expect(cloudflareClientIp({ headers: { 'cf-connecting-ip': '' } })).toBeNull()
  })
})

describe('isPrivatePeer', () => {
  it.each(['127.0.0.1', '::1', '10.1.2.3', '172.16.0.5', '172.31.255.1', '192.168.0.10', '::ffff:172.18.0.4', 'fd00::1'])(
    'treats %s as internal',
    (address) => expect(isPrivatePeer(address)).toBe(true),
  )

  it.each(['203.0.113.7', '172.15.0.1', '172.32.0.1', '8.8.8.8', '2001:db8::1', '::ffff:8.8.8.8'])(
    'treats %s as external',
    (address) => expect(isPrivatePeer(address)).toBe(false),
  )

  it('treats an unknown peer as external', () => {
    expect(isPrivatePeer(undefined)).toBe(false)
  })
})
