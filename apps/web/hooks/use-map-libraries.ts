'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { NaverBounds } from './use-naver-map'

interface Library {
  id: number; name: string; address: string; lat: number; lng: number; phone?: string
}

const SEOUL_DEFAULT_BOUNDS: NaverBounds = {
  swLat: 37.4979, swLng: 126.8625, neLat: 37.6351, neLng: 127.0937,
}

export function useMapLibraries(bounds: NaverBounds | null) {
  const [libraries, setLibraries] = useState<Library[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchLibraries = useCallback(async (b: NaverBounds) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        swLat: b.swLat.toString(), swLng: b.swLng.toString(),
        neLat: b.neLat.toString(), neLng: b.neLng.toString(),
      })
      const res = await fetch(`/api/libraries/in-bounds?${params}`, { signal: ctrl.signal })
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()
      setLibraries(json.data ?? [])
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setError('도서관 목록을 불러오지 못했습니다')
      setLibraries([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const target = bounds ?? SEOUL_DEFAULT_BOUNDS
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchLibraries(target), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [bounds, fetchLibraries])

  return { libraries, isLoading, error }
}
