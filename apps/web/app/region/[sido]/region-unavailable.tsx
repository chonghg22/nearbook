import Link from 'next/link'

export function RegionUnavailable() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16" role="status">
      <h1 className="text-2xl font-bold">지역 도서관 목록을 준비하고 있습니다</h1>
      <p className="mt-3 text-muted-foreground">
        현재 지역 목록을 안내하기 어렵습니다. 도서관이 없다는 뜻은 아닙니다. 잠시 후 다시 확인하거나
        지도에서 찾아보세요.
      </p>
      <Link href="/libraries" className="mt-6 inline-block text-primary-700 underline">
        지도에서 도서관 찾기
      </Link>
    </section>
  )
}
