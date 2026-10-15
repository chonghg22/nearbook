'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import {
  parseWishlists,
  parseSavedLibraries,
  personalResponse,
  personalErrorMessage,
} from '@/lib/personal-data'
import { usePersonalLoad } from '@/lib/use-personal-load'
import { PersonalLoadState } from '@/components/me/personal-load-state'
import { DefaultHolding } from './default-holding'

export function WishlistView() {
  const wishlist = usePersonalLoad('/me/wishlists', parseWishlists)
  const libraries = usePersonalLoad('/me/library-cards', parseSavedLibraries)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [needsReload, setNeedsReload] = useState(false)
  const busy = useRef(false)
  useEffect(() => {
    busy.current = false
    setPending(null)
    setError(null)
    setNeedsReload(false)
  }, [wishlist.scopeSignal])
  async function remove(isbn: string) {
    if (busy.current || needsReload) return
    busy.current = true
    setPending(isbn)
    setError(null)
    const signal = wishlist.scopeSignal
    try {
      await personalResponse(`/wishlists/${isbn}`, { method: 'DELETE', signal })
      if (!signal.aborted) wishlist.refresh()
    } catch (cause) {
      if (!signal.aborted) {
        setError(personalErrorMessage(cause))
        setNeedsReload(true)
      }
    } finally {
      if (!signal.aborted) {
        busy.current = false
        setPending(null)
      }
    }
  }
  function reload() {
    setNeedsReload(false)
    setError(null)
    wishlist.refresh()
    libraries.refresh()
  }
  const defaults = libraries.data?.items.filter((card) => card.isDefault) ?? []
  const card = defaults.length === 1 ? defaults[0] : undefined
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">내 위시리스트</h2>
        <button
          type="button"
          onClick={reload}
          disabled={pending !== null}
          className="rounded-full border px-4 py-2 text-sm"
        >
          목록 새로 불러오기
        </button>
      </div>
      <div className="mb-5 rounded-xl border bg-white p-4">
        <p className="text-sm font-medium">
          {card
            ? `보유 조회 기준: ${card.library.name}`
            : '기본 도서관을 선택해 찜한 책의 보유 상태를 확인하세요.'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          조회 버튼을 누른 책 한 권·기본 도서관 한 곳만 확인합니다. 실제 대출·예약은 공식 사이트에서
          확인하세요.
        </p>
        <Link
          href="/me/libraries"
          prefetch={false}
          className="mt-2 inline-flex rounded-full border px-4 py-2 text-sm"
        >
          기본 도서관 선택·변경
        </Link>
        {(libraries.loading || Boolean(libraries.error)) && (
          <div className="mt-2">
            <PersonalLoadState
              loading={libraries.loading}
              error={libraries.error}
              retry={libraries.refresh}
              next="/me/wishlist"
            />
          </div>
        )}
        {defaults.length > 1 && (
          <p role="alert" className="mt-2 text-sm">
            기본 도서관이 여러 곳입니다. 내 도서관에서 한 곳을 다시 선택해 주세요.
          </p>
        )}
      </div>
      {error && (
        <div role="alert" className="mb-4 rounded-xl border p-4">
          <p>{error} 삭제 결과가 불확실할 수 있어 다시 삭제하기 전에 목록을 확인해 주세요.</p>
          <button type="button" onClick={reload} className="mt-2 rounded-full border px-4 py-2">
            상태 다시 불러오기
          </button>
        </div>
      )}
      {wishlist.loading || wishlist.error ? (
        <PersonalLoadState
          loading={wishlist.loading}
          error={wishlist.error}
          retry={reload}
          next="/me/wishlist"
        />
      ) : (
        wishlist.data && (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              {wishlist.data.total}
              {wishlist.data.plan === 'free' ? ' / 10' : ''}권
            </p>
            {wishlist.data.items.length === 0 && (
              <div className="py-8 text-center">
                <p>아직 위시리스트가 비어 있습니다.</p>
                <Link
                  href="/search"
                  prefetch={false}
                  className="mt-3 inline-flex rounded-full border px-4 py-2"
                >
                  책 검색하러 가기
                </Link>
              </div>
            )}
            <ul className="space-y-3">
              {wishlist.data.items.map((item) => (
                <li key={item.isbn} className="rounded-xl border bg-white p-3">
                  <div className="flex min-w-0 gap-3">
                    <Link
                      href={`/book/${item.isbn}`}
                      prefetch={false}
                      className="shrink-0"
                      aria-label={`${item.title ?? item.isbn} 상세 보기`}
                    >
                      {item.coverUrl ? (
                        <Image
                          src={item.coverUrl}
                          alt=""
                          width={56}
                          height={80}
                          className="rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-14 items-center justify-center rounded bg-gray-100 text-xs">
                          표지 없음
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                      <Link
                        href={`/book/${item.isbn}`}
                        prefetch={false}
                        className="line-clamp-2 text-sm font-medium hover:underline"
                      >
                        {item.title ?? '(제목 없음)'}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">{item.author}</p>
                      <p className="mt-1 text-xs">ISBN {item.isbn}</p>
                      {item.note && <p className="mt-1 text-xs italic">{item.note}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(item.isbn)}
                      disabled={pending !== null || needsReload}
                      aria-label={`${item.title ?? item.isbn} 위시리스트에서 제거`}
                      className="shrink-0 self-start rounded-full p-3 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {card && (
                    <DefaultHolding
                      key={`${item.isbn}:${card.libraryId}`}
                      isbn={item.isbn}
                      card={card}
                    />
                  )}
                </li>
              ))}
            </ul>
            {wishlist.data.plan === 'free' && (
              <div className="mt-6 rounded-lg border border-dashed border-primary-200 p-4 text-center">
                <p className="text-sm text-gray-600">Pro로 업그레이드하면 위시리스트 무제한</p>
                <button className="mt-2 text-sm font-medium text-primary hover:underline">
                  Pro 알아보기 →
                </button>
              </div>
            )}
          </>
        )
      )}
    </div>
  )
}
