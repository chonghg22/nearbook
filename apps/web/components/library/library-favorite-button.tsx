'use client'
import { Star } from 'lucide-react'
import Link from 'next/link'
import { useSavedToggle } from '@/lib/use-saved-toggle'

export function LibraryFavoriteButton({
  libraryId,
}: {
  libraryId: number
  initialAdded?: boolean
}) {
  const saved = useSavedToggle({
    statusPath: `/me/library-cards/${libraryId}/status`,
    addPath: '/library-cards',
    removePath: `/library-cards/by-library/${libraryId}`,
    addBody: { libraryId },
  })
  return (
    <div className="max-w-full">
      {saved.mode === 'anonymous' ? (
        <Link
          href={`/login?next=${encodeURIComponent(`/library/${libraryId}`)}`}
          prefetch={false}
          className="inline-flex rounded-full border px-4 py-2 text-sm"
        >
          로그인하고 내 도서관 등록
        </Link>
      ) : (
        <button
          type="button"
          onClick={saved.toggle}
          disabled={saved.busy || saved.mode !== 'ready'}
          aria-label={
            saved.mode === 'error'
              ? '등록 상태 확인 필요'
              : saved.added
                ? '즐겨찾기 도서관에서 제거'
                : '즐겨찾기 도서관에 추가'
          }
          aria-pressed={saved.mode === 'ready' ? saved.added : undefined}
          className="flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm disabled:opacity-50"
        >
          <Star size={16} fill={saved.mode === 'ready' && saved.added ? 'currentColor' : 'none'} />
          {saved.busy
            ? '저장 중…'
            : saved.mode === 'checking'
              ? '등록 상태 확인 중…'
              : saved.mode === 'error'
                ? '등록 상태 확인 필요'
                : saved.added
                  ? '즐겨찾기됨'
                  : '즐겨찾기'}
        </button>
      )}
      {saved.error && saved.mode !== 'anonymous' && (
        <div role="alert" className="mt-2 max-w-sm rounded-lg border bg-white p-3 text-sm">
          <p>{saved.error} 변경 전 상태를 다시 확인해 주세요.</p>
          <button
            type="button"
            onClick={saved.retry}
            className="mt-2 rounded-full border px-3 py-2"
          >
            등록 상태 다시 확인
          </button>
        </div>
      )}
      {saved.notice !== null && (
        <div role="status" className="mt-2 max-w-sm rounded-lg border bg-white p-3 text-sm">
          <p>{saved.notice ? '내 도서관에 등록했습니다.' : '내 도서관에서 제거했습니다.'}</p>
          <Link
            href="/me/libraries"
            prefetch={false}
            className="mt-2 inline-flex rounded-full border px-3 py-2"
          >
            기본 도서관 선택·확인
          </Link>
        </div>
      )}
    </div>
  )
}
