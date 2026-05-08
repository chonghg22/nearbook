'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

type AdSenseSlotProps = {
  slot: string | undefined
  label?: string
  className?: string
}

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
const SHOW_PLACEHOLDER = process.env.NODE_ENV !== 'production'

export function AdSenseSlot({
  slot,
  label,
  className = '',
}: AdSenseSlotProps) {
  const adRef = useRef<HTMLModElement | null>(null)
  const isEnabled = Boolean(ADSENSE_CLIENT && slot)

  useEffect(() => {
    if (!isEnabled || !adRef.current) return

    const adElement = adRef.current
    const adStatus = adElement.getAttribute('data-adsbygoogle-status')

    if (adStatus) return

    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
    } catch (error) {
      console.error('AdSense slot failed to initialize:', error)
    }
  }, [isEnabled, slot])

  if (!isEnabled) {
    if (!SHOW_PLACEHOLDER) return null

    return (
      <div className={`mx-auto my-8 max-w-7xl px-4 ${className}`.trim()}>
        <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-border bg-canvas-subtle px-4 text-center text-xs text-muted-foreground">
          [{label ?? '광고'}: AdSense 환경변수 또는 슬롯 미설정]
        </div>
      </div>
    )
  }

  return (
    <div className={`mx-auto my-8 max-w-7xl px-4 ${className}`.trim()}>
      <ins
        ref={adRef}
        className="adsbygoogle block overflow-hidden rounded-2xl"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
