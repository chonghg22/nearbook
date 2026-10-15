'use client'

import { useEffect, useState } from 'react'

// dvh alone need not shrink when a mobile keyboard covers the visual viewport.
export function useVisualViewportHeight(open: boolean) {
  const [bounds, setBounds] = useState<{
    height: number
    top: number
    bottom: number
    center: number
  }>()
  useEffect(() => {
    if (!open) return
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () =>
      setBounds({
        height: Math.max(0, viewport.height - 16),
        top: viewport.offsetTop,
        center: viewport.offsetTop + viewport.height / 2,
        bottom: Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop),
      })
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [open])
  return open ? bounds : undefined
}
