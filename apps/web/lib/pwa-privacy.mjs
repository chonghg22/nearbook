const LEGACY_CACHE = /^(?:static|images|api)-v\d+-\d{4}-\d{2}-\d{2}$/
const PUBLIC_CACHE = /^nearbook-public-/

/** Delete only this application's caches, never cookies or server records.
 * @param {CacheStorage | undefined} storage
 * @param {boolean} [includePublic]
 */
export async function clearPwaCaches(storage, includePublic = false) {
  if (!storage) return
  const keys = await storage.keys()
  await Promise.all(keys.filter((key) => LEGACY_CACHE.test(key) || (includePublic && PUBLIC_CACHE.test(key)))
    .map((key) => storage.delete(key)))
}

/** Synchronous Supabase callback; document navigation drops Router Cache/state.
 * @param {{clear: () => Promise<void>, hide: () => void, reload: () => void}} actions
 */
export function accountBoundary(actions) {
  let initialized = false
  /** @type {string | null} */
  let previous = null
  let changing = false
  return /** @param {string | null} userId */ (userId) => {
    if (!initialized) { initialized = true; previous = userId; return }
    if (previous === userId || changing) return
    previous = userId
    changing = true
    actions.hide()
    void Promise.resolve().then(actions.clear).catch(() => {}).finally(actions.reload)
  }
}
