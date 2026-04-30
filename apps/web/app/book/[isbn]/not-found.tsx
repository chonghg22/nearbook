import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">책을 찾을 수 없습니다</h1>
      <p className="text-gray-500 mb-6">ISBN이 잘못되었거나 정보나루에 등록되지 않은 책입니다.</p>
      <Link href="/" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        홈으로 돌아가기
      </Link>
    </div>
  )
}
