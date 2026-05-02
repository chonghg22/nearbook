import { LibrariesMapSection } from './_components/libraries-map-section'

export default function HomePage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">우리동네책</h1>
        <p className="mt-4 text-lg text-gray-600">내 주변 도서관과 소장 도서를 한눈에 확인하세요.</p>
      </div>

      <LibrariesMapSection />

      {/* TODO Step 3: 나머지 홈페이지 구현 (인기 도서 등) */}
    </main>
  )
}
