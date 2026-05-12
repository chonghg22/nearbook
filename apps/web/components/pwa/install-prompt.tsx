'use client'

import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const SUPPRESS_KEY = 'pwa-install-suppressed-until'
const VISIT_COUNT_KEY = 'pwa-visit-count'
const BOOK_VIEW_COUNT_KEY = 'pwa-book-view-count'

function Banner({
  children,
  actions,
}: {
  children: React.ReactNode
  actions: React.ReactNode
}) {
  return (
    <div className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-md rounded-3xl border border-gray-200 bg-white p-4 shadow-2xl">
      <p className="pr-2 text-sm leading-6 text-gray-800">{children}</p>
      <div className="mt-4 flex items-center gap-2">{actions}</div>
    </div>
  )
}

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showAndroid, setShowAndroid] = useState(false)
  const [showIos, setShowIos] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const suppressedUntil = Number(window.localStorage.getItem(SUPPRESS_KEY) || 0)
    if (Date.now() < suppressedUntil) return

    const visitCount = Number(window.localStorage.getItem(VISIT_COUNT_KEY) || 0)
    const bookViewCount = Number(window.localStorage.getItem(BOOK_VIEW_COUNT_KEY) || 0)
    const eligible = visitCount >= 2 || bookViewCount >= 1
    if (!eligible) return

    const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    if (standalone) return

    const isIos = /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream
    if (isIos) {
      const timeout = window.setTimeout(() => {
        setShowIos(true)
        trackEvent('pwa_install_prompt_shown', { platform: 'ios' })
      }, 30_000)
      return () => window.clearTimeout(timeout)
    }

    const handler = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
      setShowAndroid(true)
      trackEvent('pwa_install_prompt_shown', { platform: 'android' })
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function suppress(days: number) {
    window.localStorage.setItem(SUPPRESS_KEY, String(Date.now() + days * 86_400_000))
    setShowAndroid(false)
    setShowIos(false)
  }

  async function handleInstall() {
    if (!promptEvent) return

    trackEvent('pwa_install_clicked', { platform: 'android' })
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    trackEvent('pwa_install_result', { platform: 'android', outcome })

    if (outcome === 'dismissed') {
      suppress(7)
      return
    }

    setShowAndroid(false)
  }

  if (showIos) {
    return (
      <Banner
        actions={(
          <>
            <button
              type="button"
              onClick={() => suppress(14)}
              className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700"
            >
              나중에
            </button>
          </>
        )}
      >
        홈 화면에 추가하면 앱처럼 바로 열 수 있어요. Safari 하단의 공유 버튼에서 <strong>홈 화면에 추가</strong>를 눌러주세요.
      </Banner>
    )
  }

  if (!showAndroid) return null

  return (
    <Banner
      actions={(
        <>
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            설치
          </button>
          <button
            type="button"
            onClick={() => suppress(7)}
            className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700"
          >
            나중에
          </button>
        </>
      )}
    >
      홈 화면에 추가해서 한 번에 도서관 책 검색을 시작하세요.
    </Banner>
  )
}
