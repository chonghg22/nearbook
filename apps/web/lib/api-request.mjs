/** @typedef {import('@nearbook/shared-types').ApiRequestKind} RequestKind */
/** @typedef {RequestInit & {timeoutMs?: number, fetchImpl?: typeof fetch, maxChars?: number, notFoundNull?: boolean}} ApiRequestOptions */

// No URL, token, upstream response body or original exception is exposed.
export class ApiRequestError extends Error {
  /** @param {RequestKind} kind @param {number | undefined} [status] */
  constructor(kind, status) {
    super(`API request failed: ${kind}${status === undefined ? '' : ` (${status})`}`)
    this.name = 'ApiRequestError'
    this.kind = kind
    this.status = status
  }
}

/** One deadline covers authentication (in fetchImpl), transport AND body reads.
 * @template T
 * @param {string} url
 * @param {ApiRequestOptions} options
 * @param {(response: Response) => Promise<T>} consume
 * @returns {Promise<T>}
 */
async function boundedRequest(url, options, consume) {
  const {
    timeoutMs = 8000,
    fetchImpl = fetch,
    signal,
    maxChars: _max,
    notFoundNull: _missing,
    ...init
  } = options
  if (signal?.aborted) throw new ApiRequestError('aborted')
  const controller = new AbortController()
  let timedOut = false
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer
  /** @type {Promise<never>} */
  const stopped = new Promise((_, reject) => {
    controller.signal.addEventListener(
      'abort',
      () => reject(new ApiRequestError(timedOut ? 'timeout' : 'aborted')),
      { once: true }
    )
    timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
  })
  try {
    return await Promise.race([
      (async () => {
        const response = await fetchImpl(url, {
          ...init,
          cache: 'no-store',
          signal: controller.signal,
        })
        if (controller.signal.aborted) throw new ApiRequestError(timedOut ? 'timeout' : 'aborted')
        return consume(response)
      })(),
      stopped,
    ])
  } catch (error) {
    if (controller.signal.aborted) throw new ApiRequestError(timedOut ? 'timeout' : 'aborted')
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('network')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}

/** @param {Response} response @param {number} maxChars */
async function jsonBody(response, maxChars) {
  if (Number(response.headers?.get?.('content-length') ?? 0) > maxChars)
    throw new ApiRequestError('invalid-response')
  /** @type {unknown} */
  let value
  if (typeof response.text === 'function') {
    const body = await response.text()
    if (body.length > maxChars) throw new ApiRequestError('invalid-response')
    try {
      value = JSON.parse(body)
    } catch {
      throw new ApiRequestError('invalid-response')
    }
  } else {
    // Supports minimal fetch adapters; real Fetch Responses always use text().
    try {
      value = await response.json()
    } catch {
      throw new ApiRequestError('invalid-response')
    }
  }
  if (value === null || value === undefined) throw new ApiRequestError('invalid-response')
  return value
}

/** Non-OK/malformed data is never an empty result. Only explicit opt-in 404 is null.
 * @param {string} url @param {ApiRequestOptions} [options] @returns {Promise<unknown | null>}
 */
export function requestApiJson(url, options = {}) {
  return boundedRequest(url, options, async (response) => {
    if (response.status === 404 && options.notFoundNull) return null
    if (!response.ok) throw new ApiRequestError('http', response.status)
    return jsonBody(response, options.maxChars ?? 1_000_000)
  })
}

/** Compatibility for auth mutations inspecting Response.status (401/403).
 * Body read is still bounded; error bodies are replaced by a safe fixed shape.
 * @param {string} url @param {ApiRequestOptions} [options] @returns {Promise<Response>}
 */
export function requestApiResponse(url, options = {}) {
  return boundedRequest(url, options, async (response) => {
    if (!response.ok)
      return Response.json(
        { error: 'request_failed', statusCode: response.status },
        { status: response.status }
      )
    if (response.status === 204) return new Response(null, { status: 204 })
    const value = await jsonBody(response, options.maxChars ?? 1_000_000)
    return Response.json(value, { status: response.status })
  })
}
