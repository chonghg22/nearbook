'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { NaverBounds } from './use-naver-map'
import { createLatestRequest, requestLibraries, resolveLibraryQuery } from '@/lib/map-libraries.mjs'

export interface MapLibrary {
  id: number; name: string; address: string; lat: number; lng: number
}

export interface MapCenter {
  lat: number; lng: number; zoom: number
}

export interface LibraryRegion {
  sido: string
  sigungu?: string | undefined
}

interface State {
  key: string
  scope: string
  status: 'loading' | 'success' | 'error'
  libraries: MapLibrary[]
  center: MapCenter | null
  limited: boolean
}

const NO_LIBRARIES: MapLibrary[] = []

/**
 * 지역을 넘기면 지도 bounds보다 지역 조회가 우선한다. bounds가 없으면(목록 모드, SDK 실패) 서울 기본 영역을 쓴다.
 * 최신 요청만 상태를 바꾸고, 지역이 바뀌면 로딩·실패 중에도 이전 지역 목록을 보여주지 않는다.
 */
export function useMapLibraries(bounds: NaverBounds | null, region?: LibraryRegion) {
  const query = resolveLibraryQuery({ bounds, sido: region?.sido, sigungu: region?.sigungu })
  const queryRef = useRef(query)
  queryRef.current = query
  const [latest] = useState(createLatestRequest)
  const [retryCount, setRetryCount] = useState(0)
  const [state, setState] = useState<State>(() => ({
    key: query.key, scope: query.scope, status: 'loading', libraries: NO_LIBRARIES, center: null, limited: false,
  }))

  useEffect(() => {
    const current = queryRef.current
    const request = latest.begin()
    const timer = setTimeout(async () => {
      try {
        const result = await requestLibraries(current, { signal: request.signal })
        if (request.isCurrent()) setState({ key: current.key, scope: current.scope, status: 'success', ...result })
      } catch {
        if (request.isCurrent()) {
          setState({ key: current.key, scope: current.scope, status: 'error', libraries: NO_LIBRARIES, center: null, limited: false })
        }
      }
    }, current.debounceMs)
    return () => {
      clearTimeout(timer)
      latest.cancel()
    }
  }, [query.key, retryCount, latest])

  const retry = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    setRetryCount((n) => n + 1)
  }, [])

  const settled = state.key === query.key && state.status !== 'loading'
  const failed = settled && state.status === 'error'
  return {
    // 지역 선택(또는 지도 bounds) 범위. 지도는 범위가 바뀔 때만 열린 InfoWindow를 닫는다.
    scope: query.scope,
    // 지도 이동(같은 bounds 범위)에서는 새 응답 전까지 이전 마커를 유지한다.
    libraries: state.scope === query.scope && state.status !== 'error' ? state.libraries : NO_LIBRARIES,
    center: settled && !failed ? state.center : null,
    limited: settled && !failed && state.limited,
    isLoading: !settled,
    isEmpty: settled && !failed && state.libraries.length === 0,
    error: failed ? '도서관 목록을 불러오지 못했습니다' : null,
    retry,
  }
}
