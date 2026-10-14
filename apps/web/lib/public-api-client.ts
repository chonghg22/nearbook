import { ApiRequestError, requestApiJson } from './api-request.mjs'

// Deliberately has no Supabase/cookie/token imports. Preserve same-origin
// credential mode for protected Vercel previews, never attach an API bearer.
// Next's /api rewrite uses the validated server upstream. Do not bypass it with
// an absolute browser API URL: new preview origins are not in upstream CORS.
export async function publicApiJson<T>(
  path: string,
  parse: (value: unknown) => T,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new ApiRequestError('invalid-response')
  const headers = new Headers(options.headers)
  headers.delete('Authorization')
  const value = await requestApiJson(`/api${path}`, {
    ...options,
    headers,
    credentials: 'same-origin',
  })
  try {
    return parse(value)
  } catch {
    throw new ApiRequestError('invalid-response')
  }
}
