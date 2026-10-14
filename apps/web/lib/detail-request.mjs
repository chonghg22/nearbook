import { requestApiJson } from './api-request.mjs'
// Preserve the old import/instanceof contract while sharing one transport.
export { ApiRequestError as DetailRequestError } from './api-request.mjs'

/**
 * Bound the entire request, including JSON parsing. The API already caches book metadata.
 * no-store keeps transient errors and missing responses out of Next's persistent data cache.
 * @param {string} url
 * @param {{ timeoutMs?: number, fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<unknown | null>}
 */
export async function requestDetail(url, { timeoutMs = 8000, fetchImpl = fetch } = {}) {
  return requestApiJson(url, { timeoutMs, fetchImpl, notFoundNull: true })
}
