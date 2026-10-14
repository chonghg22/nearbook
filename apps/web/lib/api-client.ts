import { createClient } from '@/lib/supabase/client'
import { PUBLIC_API_BASE_URL } from '@/lib/constants'
import { ApiRequestError, requestApiResponse } from './api-request.mjs'

type Options = RequestInit & { timeoutMs?: number }

/** Authenticated API only; public search/suggestions must use public-api-client.
 * Compatibility Response.status remains available for login/plan-limit UI.
 */
export async function authenticatedApiFetch(
  path: string,
  options: Options = {}
): Promise<Response> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new ApiRequestError('invalid-response')
  return authenticatedRequest(`${PUBLIC_API_BASE_URL}${path}`, options)
}

async function authenticatedRequest(url: string, options: Options): Promise<Response> {
  return requestApiResponse(url, {
    ...options,
    credentials: 'include',
    fetchImpl: async (input, init) => {
      const {
        data: { session },
      } = await createClient().auth.getSession()
      if (init?.signal?.aborted) throw new ApiRequestError('aborted')
      // Do not refresh an anonymous session or send a private request without one.
      if (!session?.access_token)
        return Response.json({ error: 'authentication_required' }, { status: 401 })
      const headers = new Headers(init?.headers)
      if (init?.body && !headers.has('Content-Type'))
        headers.set('Content-Type', 'application/json')
      headers.set('Authorization', `Bearer ${session.access_token}`)
      return fetch(input, { ...init, headers })
    },
  })
}

/** @deprecated Explicit authenticatedApiFetch is preferred. */
export const apiFetch = authenticatedApiFetch

/** Same-origin authenticated web endpoints; rejects external/ambiguous paths. */
export async function authFetch(path: string, options: Options = {}): Promise<Response> {
  if (!path.startsWith('/auth-api/') || path.startsWith('//'))
    throw new ApiRequestError('invalid-response')
  return authenticatedRequest(path, options)
}
