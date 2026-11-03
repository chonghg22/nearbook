// Public origin of the incoming request. Route handlers under `next start` may report `localhost`
// in request.url, so prefer the forwarded/host headers set by the platform. Any redirect_uri built
// from this is still exact-matched by the API allowlist and Kakao's registered URIs.
export function publicOrigin(request: Request) {
  const url = new URL(request.url)
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host')?.trim()
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || url.protocol.replace(':', '')
  if (!host || !/^[A-Za-z0-9.-]+(:\d{1,5})?$/.test(host) || !['http', 'https'].includes(proto)) return url.origin
  return `${proto}://${host}`
}
