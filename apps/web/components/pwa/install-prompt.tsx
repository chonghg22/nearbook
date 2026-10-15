'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { hasUsefulAction, PWA_USEFUL_ACTION_EVENT } from '@/lib/pwa-install-eligibility'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
const SUPPRESS_KEY = 'pwa-install-dismissed'

export function InstallPrompt() {
  const pathname = usePathname()
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [eligible, setEligible] = useState(false)
  const [iosReady, setIosReady] = useState(false)
  const [closed, setClosed] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState(false)
  const shown = useRef(false)
  const busy = useRef(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SUPPRESS_KEY)) return
    } catch {
      /* Continue without persistent storage. */
    }
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    if (standalone) return

    setEligible(hasUsefulAction())
    const complete = () => setEligible(true)
    window.addEventListener(PWA_USEFUL_ACTION_EVENT, complete)
    // Capture early: browsers may dispatch this before the first useful action.
    const capture = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', capture)
    return () => {
      window.removeEventListener(PWA_USEFUL_ACTION_EVENT, complete)
      window.removeEventListener('beforeinstallprompt', capture)
    }
  }, [])

  useEffect(() => {
    if (!eligible || closed) return
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as Window & { MSStream?: unknown }).MSStream
    if (!ios) return
    const timer = window.setTimeout(() => setIosReady(true), 30_000)
    return () => window.clearTimeout(timer)
  }, [eligible, closed])

  const publicRoute =
    pathname === '/' ||
    pathname === '/search' ||
    pathname === '/libraries' ||
    pathname.startsWith('/book/') ||
    pathname.startsWith('/library/')
  const visible = publicRoute && eligible && !closed && (iosReady || promptEvent !== null)
  useEffect(() => {
    if (!visible || shown.current) return
    shown.current = true
    trackEvent('pwa_install_prompt_shown', { platform: iosReady ? 'ios' : 'android' })
  }, [visible, iosReady])

  function dismiss() {
    try {
      window.localStorage.setItem(SUPPRESS_KEY, '1')
    } catch {
      /* In-memory dismissal still works. */
    }
    setClosed(true)
  }

  async function handleInstall() {
    if (!promptEvent || busy.current) return
    busy.current = true
    setInstalling(true)
    setError(false)
    try {
      trackEvent('pwa_install_clicked', { platform: 'android' })
      await promptEvent.prompt()
      const { outcome } = await promptEvent.userChoice
      trackEvent('pwa_install_result', { platform: 'android', outcome })
      dismiss()
    } catch {
      setError(true)
    } finally {
      busy.current = false
      setInstalling(false)
    }
  }

  if (!visible) return null
  return (
    // In normal page flow before the footer: never overlays search, maps or dialogs.
    <aside
      aria-label="홈 화면에 추가"
      className="mx-auto my-6 w-[calc(100%_-_2rem)] max-w-md rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <p className="text-sm leading-6 text-gray-800">
        {iosReady
          ? '홈 화면에 추가하면 앱처럼 바로 열 수 있어요.'
          : '홈 화면에 추가해서 한 번에 도서관 책 검색을 시작하세요.'}
      </p>
      {iosReady && (
        <p className="mt-2 text-sm leading-6">
          Safari 공유 버튼에서 <strong>홈 화면에 추가</strong>를 눌러주세요.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          설치를 시작하지 못했습니다. 다시 시도하거나 나중에 설치해 주세요.
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!iosReady && (
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {installing ? '설치 확인 중…' : '설치'}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700"
        >
          나중에
        </button>
      </div>
    </aside>
  )
}
