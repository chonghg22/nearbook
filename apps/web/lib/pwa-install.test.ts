// @vitest-environment jsdom
import { createElement as h } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, it, expect, vi } from 'vitest'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import {
  hasUsefulAction,
  markUsefulAction,
  PWA_USEFUL_ACTION_EVENT,
} from './pwa-install-eligibility'
import { trackEvent } from './analytics'

const nav = vi.hoisted(() => ({ pathname: '/search' }))
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }))
vi.mock('./analytics', () => ({ trackEvent: vi.fn() }))
let standalone = false
beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  sessionStorage.clear()
  nav.pathname = '/search'
  standalone = false
  vi.mocked(trackEvent).mockClear()
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: standalone }),
  })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})
function installEvent(
  prompt = vi.fn(async () => {}),
  outcome: 'accepted' | 'dismissed' = 'accepted'
) {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome }),
  })
  act(() => {
    window.dispatchEvent(event)
  })
  return event
}
const banner = () => screen.queryByRole('complementary', { name: '홈 화면에 추가' })
it('repeated visits and raw detail views no longer qualify without a completed useful action', () => {
  localStorage.setItem('pwa-visit-count', '50')
  localStorage.setItem('pwa-book-view-count', '50')
  render(h(InstallPrompt))
  const event = installEvent()
  expect(event.defaultPrevented).toBe(true)
  expect(banner()).toBeNull()
  expect(trackEvent).not.toHaveBeenCalled()
  expect(event.prompt).not.toHaveBeenCalled()
})
it('an early browser event is retained and displayed only after useful action, inline not fixed', () => {
  render(h(InstallPrompt))
  const event = installEvent()
  act(() => {
    markUsefulAction()
  })
  expect(hasUsefulAction()).toBe(true)
  expect(banner()).toBeTruthy()
  expect(banner()!.className).not.toMatch(/fixed|absolute|z-\[/)
  expect(event.prompt).not.toHaveBeenCalled()
  expect(trackEvent).toHaveBeenCalledExactlyOnceWith('pwa_install_prompt_shown', {
    platform: 'android',
  })
  act(() => {
    markUsefulAction()
  })
  expect(trackEvent).toHaveBeenCalledOnce()
})
it('useful action before mount also qualifies, with no query or ISBN in the signal', () => {
  const listener = vi.fn()
  window.addEventListener(PWA_USEFUL_ACTION_EVENT, listener)
  markUsefulAction()
  expect(listener).toHaveBeenCalledOnce()
  expect((listener.mock.calls[0]![0] as CustomEvent).detail).toBeUndefined()
  expect(sessionStorage.length).toBe(1)
  expect(sessionStorage.getItem('pwa-useful-action-completed')).toBe('1')
  window.removeEventListener(PWA_USEFUL_ACTION_EVENT, listener)
  render(h(InstallPrompt))
  installEvent()
  expect(banner()).toBeTruthy()
})
it('useful action alone never invents an Android install capability', () => {
  render(h(InstallPrompt))
  act(() => {
    markUsefulAction()
  })
  act(() => {
    vi.advanceTimersByTime(60_000)
  })
  expect(banner()).toBeNull()
})
it('iOS delay starts after useful action, never on initial visit, and offers instructions only', () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone Safari')
  render(h(InstallPrompt))
  act(() => {
    vi.advanceTimersByTime(60_000)
  })
  expect(banner()).toBeNull()
  act(() => {
    markUsefulAction()
  })
  act(() => {
    vi.advanceTimersByTime(29_999)
  })
  expect(banner()).toBeNull()
  act(() => {
    vi.advanceTimersByTime(1)
  })
  expect(banner()!.textContent).toContain('Safari 공유 버튼')
  expect(screen.queryByRole('button', { name: '설치' })).toBeNull()
  expect(trackEvent).toHaveBeenCalledExactlyOnceWith('pwa_install_prompt_shown', {
    platform: 'ios',
  })
})
it('dismissal stays hidden across route changes, more useful actions and remounts', () => {
  markUsefulAction()
  const view = render(h(InstallPrompt))
  installEvent()
  fireEvent.click(screen.getByRole('button', { name: '나중에' }))
  expect(banner()).toBeNull()
  expect(localStorage.getItem('pwa-install-dismissed')).toBe('1')
  nav.pathname = '/book/9788936434120'
  view.rerender(h(InstallPrompt))
  act(() => {
    markUsefulAction()
  })
  expect(banner()).toBeNull()
  view.unmount()
  render(h(InstallPrompt))
  installEvent()
  expect(banner()).toBeNull()
})
it('standalone installed mode never prompts even after useful action and a browser event', () => {
  standalone = true
  markUsefulAction()
  render(h(InstallPrompt))
  installEvent()
  act(() => {
    markUsefulAction()
  })
  expect(banner()).toBeNull()
})
it('camera/login/private/offline routes suppress the prompt without losing public eligibility', () => {
  markUsefulAction()
  const view = render(h(InstallPrompt))
  installEvent()
  for (const pathname of ['/scan', '/login', '/me/wishlist', '/offline']) {
    nav.pathname = pathname
    view.rerender(h(InstallPrompt))
    expect(banner()).toBeNull()
  }
  nav.pathname = '/book/9788936434120'
  view.rerender(h(InstallPrompt))
  expect(banner()).toBeTruthy()
})
it('only an explicit install click invokes prompt and pending clicks are deduplicated', async () => {
  let resolve!: () => void
  const prompt = vi.fn(
    () =>
      new Promise<void>((done) => {
        resolve = done
      })
  )
  markUsefulAction()
  render(h(InstallPrompt))
  installEvent(prompt)
  expect(prompt).not.toHaveBeenCalled()
  const button = screen.getByRole('button', { name: '설치' })
  fireEvent.click(button)
  fireEvent.click(button)
  expect(prompt).toHaveBeenCalledOnce()
  expect((button as HTMLButtonElement).disabled).toBe(true)
  await act(async () => {
    resolve()
  })
  expect(banner()).toBeNull()
  expect(trackEvent).toHaveBeenCalledWith('pwa_install_result', {
    platform: 'android',
    outcome: 'accepted',
  })
})
it('native dismissal closes the app prompt too', async () => {
  markUsefulAction()
  render(h(InstallPrompt))
  installEvent(undefined, 'dismissed')
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: '설치' }))
  })
  expect(banner()).toBeNull()
})
it('prompt failure is recoverable and never reports successful installation', async () => {
  markUsefulAction()
  render(h(InstallPrompt))
  installEvent(
    vi.fn(async () => {
      throw new Error('unavailable')
    })
  )
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: '설치' }))
  })
  expect(screen.getByRole('alert').textContent).toContain('설치를 시작하지 못했습니다')
  expect((screen.getByRole('button', { name: '설치' }) as HTMLButtonElement).disabled).toBe(false)
  expect(vi.mocked(trackEvent).mock.calls.some(([name]) => name === 'pwa_install_result')).toBe(
    false
  )
  fireEvent.click(screen.getByRole('button', { name: '나중에' }))
  expect(banner()).toBeNull()
})
it('blocked storage does not break useful actions or in-memory dismissal', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  render(h(InstallPrompt))
  installEvent()
  expect(() =>
    act(() => {
      markUsefulAction()
    })
  ).not.toThrow()
  expect(banner()).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '나중에' }))
  act(() => {
    markUsefulAction()
  })
  expect(banner()).toBeNull()
})
it('unmount removes eligibility/browser listeners and iOS timers', () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone Safari')
  const removed = vi.spyOn(window, 'removeEventListener')
  markUsefulAction()
  const view = render(h(InstallPrompt))
  view.unmount()
  expect(removed).toHaveBeenCalledWith(PWA_USEFUL_ACTION_EVENT, expect.any(Function))
  expect(removed).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
  act(() => {
    vi.advanceTimersByTime(60_000)
    window.dispatchEvent(new Event(PWA_USEFUL_ACTION_EVENT))
  })
  expect(trackEvent).not.toHaveBeenCalled()
})
