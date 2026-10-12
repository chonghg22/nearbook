export const DEFAULT_API_BASE_URL = 'https://api.near-book.com'

/** @param {string | undefined} value */
function normalize(value) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.replace(/\/+$/, '') || trimmed : undefined
}

/**
 * Never include the configured value in errors: a malformed URL may contain secrets.
 * @param {string} value
 * @param {string} name
 * @param {boolean} production
 */
function absoluteBase(value, name, production) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} must be an absolute HTTP(S) API URL`)
  }
  if (!/^https?:\/\//i.test(value) || !['http:', 'https:'].includes(url.protocol) ||
      url.username || url.password || url.search || url.hash) {
    throw new Error(`${name} must be an HTTP(S) API URL without credentials, query or fragment`)
  }
  if (['near-book.com', 'www.near-book.com'].includes(url.hostname)) {
    throw new Error(`${name} must point to the API, not the frontend (proxy loop)`)
  }
  if (production && (url.protocol !== 'https:' ||
      /^(localhost\.?|127\.|\[::1\])/.test(url.hostname))) {
    throw new Error(`${name} must use a non-loopback HTTPS API URL in production`)
  }
  return url.toString().replace(/\/+$/, '')
}

/**
 * Browser requests may use the same-origin /api proxy. Empty values mean unset.
 * @param {string | undefined} value
 * @param {boolean} [production]
 */
export function resolvePublicApiBaseUrl(value, production = false) {
  const base = normalize(value) ?? DEFAULT_API_BASE_URL
  if (base === '/api') return base
  return absoluteBase(base, 'NEXT_PUBLIC_API_BASE_URL', production)
}

/**
 * SSR, Route Handlers and rewrites must never fetch a relative browser URL.
 * @param {{ internalUrl?: string | undefined, publicUrl?: string | undefined, production?: boolean }} [options]
 */
export function resolveServerApiBaseUrl({ internalUrl, publicUrl, production = false } = {}) {
  const internal = normalize(internalUrl)
  if (internal) return absoluteBase(internal, 'INTERNAL_API_URL', production)
  const browser = resolvePublicApiBaseUrl(publicUrl, production)
  return browser === '/api' ? DEFAULT_API_BASE_URL : browser
}

/** @param {{ vercelEnv?: string | undefined, appEnv?: string | undefined }} [options] */
export function isProductionApiEnvironment({ vercelEnv, appEnv } = {}) {
  return vercelEnv === 'production' || appEnv === 'production'
}
