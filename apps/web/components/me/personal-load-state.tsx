import Link from 'next/link'
import { personalErrorMessage } from '@/lib/personal-data'
export function PersonalLoadState({
  loading,
  error,
  retry,
  next,
}: {
  loading: boolean
  error: unknown
  retry: () => void
  next: string
}) {
  if (loading)
    return (
      <p role="status" className="py-6 text-sm text-muted-foreground">
        내 정보를 불러오는 중…
      </p>
    )
  return (
    <div role="alert" className="rounded-xl border p-4">
      <p className="text-sm">{personalErrorMessage(error)} 목록이 비었다는 뜻은 아닙니다.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={retry} className="rounded-full border px-4 py-2">
          다시 불러오기
        </button>
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          prefetch={false}
          className="rounded-full border px-4 py-2"
        >
          다시 로그인
        </Link>
      </div>
    </div>
  )
}
