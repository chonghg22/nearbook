'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

interface AdSenseSlotProps {
  slot: string | undefined
  format?: 'auto' | 'fluid' | 'rectangle'
  layout?: string
  responsive?: boolean
  className?: string
  label?: string
}

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
const SHOW_PLACEHOLDER = process.env.NODE_ENV !== 'production'

export function AdSenseSlot({
  slot,
  format = 'auto',
  layout,
  responsive = true,
  className,
  label,
}: AdSenseSlotProps) {
  const ref = useRef<HTMLModElement>(null)
  const isEnabled = Boolean(ADSENSE_CLIENT && slot)

  useEffect(() => {
    if (!isEnabled || !ref.current) return

    if (ref.current.getAttribute('data-adsbygoogle-status')) return

    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (e) {
      console.error('AdSense push error:', e)
    }
  }, [isEnabled, slot])

  if (!isEnabled) {
    if (!SHOW_PLACEHOLDER) return null

    return (
      <div className={`my-6 ${className ?? ''}`.trim()}>
        <p className="mb-1 text-xs text-gray-400">광고</p>
        <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-border bg-canvas-subtle px-4 text-center text-xs text-muted-foreground">
          [{label ?? '광고'}: AdSense 환경변수 또는 슬롯 미설정]
        </div>
      </div>
    )
  }

  return (
    <div className={`my-6 ${className ?? ''}`.trim()}>
      <p className="mb-1 text-xs text-gray-400">광고</p>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        {...(layout ? { 'data-ad-layout': layout } : {})}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  )
}
