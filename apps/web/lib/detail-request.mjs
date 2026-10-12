/** Only an explicit upstream 404 means a missing detail. Never expose response bodies. */
export class DetailRequestError extends Error {
  /** @param {'http' | 'timeout' | 'network' | 'invalid-response'} kind @param {number | undefined} [status] */
  constructor(kind, status) {
    super(`Detail request failed: ${kind}${status === undefined ? '' : ` (${status})`}`)
    this.name = 'DetailRequestError'
    this.kind = kind
    this.status = status
  }
}

/**
 * Bound the entire request, including JSON parsing. The API already caches book metadata.
 * no-store keeps transient errors and missing responses out of Next's persistent data cache.
 * @param {string} url
 * @param {{ timeoutMs?: number, fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<unknown | null>}
 */
export async function requestDetail(url, { timeoutMs = 8000, fetchImpl = fetch } = {}) {
  const controller = new AbortController()
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new DetailRequestError('timeout'))
    }, timeoutMs)
  })
  const request = async () => {
    const response = await fetchImpl(url, { cache: 'no-store', signal: controller.signal })
    if (response.status === 404) return null
    if (!response.ok) throw new DetailRequestError('http', response.status)
    try {
      const json = await response.json()
      if (json === null) throw new DetailRequestError('invalid-response')
      return json
    } catch {
      throw new DetailRequestError('invalid-response')
    }
  }
  try {
    return await Promise.race([request(), timeout])
  } catch (error) {
    if (controller.signal.aborted) throw new DetailRequestError('timeout')
    if (error instanceof DetailRequestError) throw error
    throw new DetailRequestError('network')
  } finally {
    clearTimeout(timer)
  }
}
