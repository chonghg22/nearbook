'use client'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics'
import { useSavedToggle } from '@/lib/use-saved-toggle'

export function WishlistButton({ isbn }: { isbn: string; initialAdded?: boolean }) {
  const saved = useSavedToggle({
    statusPath: `/me/wishlists/${isbn}/status`,
    addPath: '/wishlists',
    removePath: `/wishlists/${isbn}`,
    addBody: { isbn },
    onChanged: (added) => trackEvent(added ? 'wishlist_add' : 'wishlist_remove', { isbn }),
  })
  return (
    <div className="max-w-full">
      {saved.mode === 'anonymous' ? (
        <Link
          href={`/login?next=${encodeURIComponent(`/book/${isbn}`)}`}
          prefetch={false}
          className="inline-flex rounded-full border px-4 py-2 text-sm"
        >
          로그인하고 찜하기
        </Link>
      ) : (
        <button
          type="button"
          onClick={saved.toggle}
          disabled={saved.busy || saved.mode !== 'ready'}
          aria-label={
            saved.mode === 'error'
              ? '찜 상태 확인 필요'
              : saved.added
                ? '위시리스트에서 제거'
                : '위시리스트에 추가'
          }
          aria-pressed={saved.mode === 'ready' ? saved.added : undefined}
          className={cn(
            'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50',
            saved.mode === 'ready' && saved.added
              ? 'border-red-200 bg-red-50 text-red-500'
              : 'bg-white text-muted-foreground'
          )}
        >
          <Heart size={16} fill={saved.mode === 'ready' && saved.added ? 'currentColor' : 'none'} />
          {saved.busy
            ? '저장 중…'
            : saved.mode === 'checking'
              ? '찜 상태 확인 중…'
              : saved.mode === 'error'
                ? '찜 상태 확인 필요'
                : saved.added
                  ? '찜됨'
                  : '찜하기'}
        </button>
      )}
      {saved.error && saved.mode !== 'anonymous' && (
        <div
          role="alert"
          className="mt-2 max-w-sm rounded-lg border bg-white p-3 text-sm [overflow-wrap:anywhere]"
        >
          <p>{saved.error} 변경 전 상태를 다시 확인해 주세요.</p>
          <button
            type="button"
            onClick={saved.retry}
            className="mt-2 rounded-full border px-3 py-2"
          >
            찜 상태 다시 확인
          </button>
        </div>
      )}
      {saved.notice !== null && (
        <div role="status" className="mt-2 max-w-sm rounded-lg border bg-white p-3 text-sm">
          <p>{saved.notice ? '위시리스트에 추가했습니다.' : '위시리스트에서 제거했습니다.'}</p>
          {saved.notice && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href="/me/libraries" prefetch={false} className="rounded-full border px-3 py-2">
                기본 도서관 선택·확인
              </Link>
              <Link href="/me/wishlist" prefetch={false} className="rounded-full border px-3 py-2">
                찜한 책 보유 확인
              </Link>
              <Link
                href="/me/notifications"
                prefetch={false}
                className="rounded-full border px-3 py-2"
              >
                매일 아침 알림 변경하기
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
