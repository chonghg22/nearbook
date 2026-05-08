import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h2 className="text-xl font-bold mb-2">도서관을 찾을 수 없습니다</h2>
      <p className="text-gray-500 text-sm mb-6">
        도서관 ID가 잘못되었거나 삭제된 도서관입니다.
      </p>
      <Link href="/libraries" className="text-primary hover:underline text-sm">
        도서관 목록으로
      </Link>
    </div>
  )
}
