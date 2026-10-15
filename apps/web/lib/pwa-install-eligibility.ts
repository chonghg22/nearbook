// Session-only, no query, ISBN, coordinates or account data in this signal.
export const PWA_USEFUL_ACTION_EVENT = 'nearbook:pwa-useful-action'
const SESSION_KEY = 'pwa-useful-action-completed'

export function hasUsefulAction(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function markUsefulAction(): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // Storage denial must not break search/holdings or in-memory eligibility.
  }
  window.dispatchEvent(new Event(PWA_USEFUL_ACTION_EVENT))
}
