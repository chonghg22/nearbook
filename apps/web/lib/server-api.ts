import { isProductionApiEnvironment, resolveServerApiBaseUrl } from './api-base-url.mjs'
import { ApiRequestError, requestApiJson } from './api-request.mjs'

// Server-only configuration. Client Components must import constants.ts instead.
export const SERVER_API_BASE_URL = resolveServerApiBaseUrl({
  internalUrl: process.env.INTERNAL_API_URL,
  publicUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  production: isProductionApiEnvironment({
    vercelEnv: process.env.VERCEL_ENV,
    appEnv: process.env.APP_ENV,
  }),
})

// The server client always uses the validated absolute upstream, never /api.
export async function serverApiJson<T>(
  path: string,
  parse: (value: unknown) => T,
  options: RequestInit & { timeoutMs?: number; notFoundNull?: boolean } = {},
): Promise<T | null> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new ApiRequestError('invalid-response')
  const value = await requestApiJson(`${SERVER_API_BASE_URL}${path}`, options)
  if (value === null && options.notFoundNull) return null
  try { return parse(value) } catch { throw new ApiRequestError('invalid-response') }
}
