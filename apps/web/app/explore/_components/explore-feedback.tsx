import React from 'react'
import { curationTiming } from '@/lib/explore-data.mjs'
import type { Timing } from '@/lib/explore-server'

export function ExploreFeedback({ status, emptyMessage, retryHref }: {
  status: 'ready' | 'empty' | 'error'; emptyMessage: string; retryHref: string
}) {
  if (status === 'ready') return null
  return (
    <div role={status === 'error' ? 'alert' : 'status'} className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-700">
      <p>{status === 'error' ? '목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' : emptyMessage}</p>
      {/* A normal document navigation bypasses the client router's failed RSC payload. */}
      <a href={retryHref} className="mt-3 inline-block rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-primary-700">다시 시도</a>
    </div>
  )
}

export function CurationNote({ items, fallback, source }: { items: Timing[]; fallback?: Timing | undefined; source: string }) {
  const timing = curationTiming(items, fallback)
  return (
    <div className="mt-6 rounded-2xl bg-primary-50 px-4 py-3 text-sm leading-6 text-primary-900">
      <p>{source}</p>
      {(items.length > 0 || fallback !== undefined) && <>
        <p>저장된 큐레이션 기간: {timing.period ?? '확인되지 않음'}</p>
        <p>마지막 수집: {timing.collectedAt ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timing.collectedAt)) : '수집 시각이 제공되지 않았습니다'}</p>
        {timing.state === 'stale' && <p role="status" className="mt-2 font-semibold">이전 시점에 저장된 자료입니다. 최신 갱신 여부는 확인되지 않았습니다.</p>}
        {timing.state === 'unknown' && <p className="mt-2">최신 수집 시각을 확인할 수 없습니다.</p>}
      </>}
    </div>
  )
}
