'use client'

import Link from 'next/link'

export function DetailError() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20 text-center" role="alert">
      <h1 className="mb-4 text-2xl font-bold">정보를 잠시 불러올 수 없습니다</h1>
      <p className="mb-6 text-muted-foreground">조회 중 문제가 발생했습니다. 책이나 도서관이 없다는 뜻은 아닙니다. 잠시 후 다시 시도해 주세요.</p>
      <div className="flex justify-center gap-4">
        <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-primary px-6 py-2 text-white">다시 시도</button>
        <Link href="/" className="rounded-lg border border-border px-6 py-2">홈으로 돌아가기</Link>
      </div>
    </main>
  )
}
