'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import {
  parseSavedLibraries,
  personalResponse,
  personalErrorMessage,
  type SavedLibraryCard,
} from '@/lib/personal-data'
import { usePersonalLoad } from '@/lib/use-personal-load'
import { PersonalLoadState } from '@/components/me/personal-load-state'
import { SavedLibrarySearch } from '@/components/me/saved-library-search'
import { libraryDirectionsUrl } from '@/lib/library-links.mjs'

export function LibraryCardsView() {
  const list = usePersonalLoad('/me/library-cards', parseSavedLibraries)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [needsReload, setNeedsReload] = useState(false)
  const busy = useRef(false)
  useEffect(() => {
    busy.current = false
    setPending(false)
    setError(null)
    setNotice(null)
    setNeedsReload(false)
  }, [list.scopeSignal])
  const defaults = list.data?.items.filter((card) => card.isDefault) ?? []
  function reload() {
    setNeedsReload(false)
    setError(null)
    setNotice(null)
    list.refresh()
  }
  async function change(kind: 'add' | 'default' | 'remove', id: number, card?: SavedLibraryCard) {
    if (busy.current || needsReload || !list.data) return
    busy.current = true
    setPending(true)
    setError(null)
    setNotice(null)
    const signal = list.scopeSignal
    try {
      const response = await personalResponse(
        kind === 'add' ? '/library-cards' : `/library-cards/${id}`,
        {
          method: kind === 'add' ? 'POST' : kind === 'default' ? 'PATCH' : 'DELETE',
          signal,
          ...(kind !== 'remove' && {
            body: JSON.stringify(kind === 'add' ? { libraryId: id } : { isDefault: true }),
          }),
        }
      )
      if (kind !== 'remove') {
        const row = (await response.json()).data
        if (
          !row ||
          !Number.isSafeInteger(row.id) ||
          row.id <= 0 ||
          row.libraryId !== (card?.libraryId ?? id) ||
          (kind === 'default' && row.isDefault !== true)
        )
          throw new Error('invalid-response')
      }
      if (signal.aborted) return
      setNotice(
        kind === 'add'
          ? '내 도서관에 등록했습니다.'
          : kind === 'default'
            ? '기본 도서관을 저장했습니다.'
            : '내 도서관에서 제거했습니다.'
      )
      list.refresh()
    } catch (cause) {
      if (!signal.aborted) {
        setError(personalErrorMessage(cause))
        setNeedsReload(true)
      }
    } finally {
      if (!signal.aborted) {
        busy.current = false
        setPending(false)
      }
    }
  }
  const disabled = pending || needsReload || list.loading || !list.data
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">내 도서관</h2>
        <button
          type="button"
          onClick={reload}
          disabled={pending}
          className="rounded-full border px-4 py-2 text-sm"
        >
          목록 새로 불러오기
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        여기서 고른 기본 도서관이 위시리스트 보유 조회 기준입니다. 홈의 지역·GPS 기준과는 별도
        설정입니다.
      </p>
      <Link
        href="/me/wishlist"
        prefetch={false}
        className="my-3 inline-flex rounded-full border px-4 py-2 text-sm"
      >
        찜한 책 보유 확인하러 가기
      </Link>
      {notice && (
        <p role="status" className="mb-3 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <div role="alert" className="mb-4 rounded-xl border p-4">
          <p>{error} 저장 결과가 불확실할 수 있으니 변경 전에 목록을 다시 확인해 주세요.</p>
          <button type="button" onClick={reload} className="mt-2 rounded-full border px-4 py-2">
            상태 다시 불러오기
          </button>
        </div>
      )}
      {list.loading || list.error ? (
        <PersonalLoadState
          loading={list.loading}
          error={list.error}
          retry={reload}
          next="/me/libraries"
        />
      ) : (
        list.data && (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              {list.data.total}
              {list.data.plan === 'free' ? ' / 1' : ''}개
            </p>
            {list.data.items.length === 0 && (
              <p className="py-3 text-sm">
                등록한 도서관이 없습니다. 아래에서 첫 기본 도서관을 선택하세요.
              </p>
            )}
            {list.data.items.length > 0 && defaults.length !== 1 && (
              <p role="alert" className="mb-3 text-sm">
                기본 도서관을 한 곳 선택해 주세요. 다른 도서관을 자동으로 기본으로 지정하지
                않습니다.
              </p>
            )}
            <ul className="space-y-3">
              {list.data.items.map((card) => {
                const directions = libraryDirectionsUrl(
                  card.library.lat,
                  card.library.lng,
                  card.library.name
                )
                return (
                  <li key={card.id} className="rounded-xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 [overflow-wrap:anywhere]">
                        <p className="text-sm font-medium">
                          {card.nickname ?? card.library.name}{' '}
                          {card.isDefault && <span className="text-primary">기본 도서관</span>}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{card.library.address}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => change('remove', card.id)}
                        disabled={disabled}
                        aria-label={`${card.library.name} 내 도서관에서 제거`}
                        className="shrink-0 rounded-full p-3 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => change('default', card.id, card)}
                        disabled={disabled || (card.isDefault && defaults.length === 1)}
                        className="rounded-full border px-4 py-2 text-sm disabled:opacity-50"
                      >
                        {card.isDefault && defaults.length === 1
                          ? '현재 기본 도서관'
                          : '기본 도서관으로 선택'}
                      </button>
                      <Link
                        href={`/library/${card.libraryId}`}
                        prefetch={false}
                        className="rounded-full border px-4 py-2 text-sm"
                      >
                        도서관 상세
                      </Link>
                      {card.library.homepage && (
                        <a
                          href={card.library.homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border px-4 py-2 text-sm"
                        >
                          공식 사이트에서 확인
                          <span className="sr-only"> — {card.library.name}, 새 탭</span>
                        </a>
                      )}
                      {directions && (
                        <a
                          href={directions}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border px-4 py-2 text-sm"
                        >
                          길찾기<span className="sr-only"> — 카카오맵, 새 탭</span>
                        </a>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )
      )}
      <SavedLibrarySearch disabled={disabled} onAdd={(id) => change('add', id)} />
      {list.data?.plan === 'free' && list.data.items.length >= 1 && (
        <div className="mt-6 rounded-lg border border-dashed border-primary-200 p-4 text-center">
          <p className="text-sm text-gray-600">무료 계정은 도서관을 1곳까지 저장할 수 있습니다.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            다른 도서관을 저장하려면 기존 도서관을 제거한 뒤 추가하세요. 기본 도서관도 다시 선택해
            주세요.
          </p>
        </div>
      )}
    </div>
  )
}
