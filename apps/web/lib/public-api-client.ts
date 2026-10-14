import { PUBLIC_API_BASE_URL } from './constants'
import { ApiRequestError, requestApiJson } from './api-request.mjs'

// Deliberately has no Supabase/cookie/token imports. Preserve same-origin
// credential mode for protected Vercel previews, never attach an API bearer.
export async function publicApiJson<T>(
  path: string,
  parse: (value: unknown) => T,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new ApiRequestError('invalid-response')
  const headers = new Headers(options.headers)
  headers.delete('Authorization')
  const value = await requestApiJson(`${PUBLIC_API_BASE_URL}${path}`, {
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
