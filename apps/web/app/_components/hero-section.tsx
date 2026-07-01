import Link from 'next/link'

type MonthlyKeyword = {
  word: string
  weight: number
}

interface HeroSectionProps {
  monthlyKeywords: MonthlyKeyword[]
}

export function HeroSection({ monthlyKeywords }: HeroSectionProps) {
  return (
    <section className="px-4 py-16 md:py-24 max-w-5xl mx-auto text-center md:text-left">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm mb-6">
        <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
        전국 1,400+ 공공도서관 통합 검색
      </div>

      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
        읽고 싶은 책,<br className="md:hidden" />
        <span className="text-primary-600"> 우리 동네 도서관</span>에 있나요?
      </h1>

      <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl">
        책 제목만 검색하면 근처 도서관의 보유 여부와 대출 가능성을 확인할 수 있어요.
      </p>

      <div className="mt-10">
        <p className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">📚 이달의 키워드</p>
        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
          {monthlyKeywords.map(({ word }) => (
            <Link
              key={word}
              href={`/search?q=${encodeURIComponent(word)}`}
              className="px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-primary-500 hover:text-primary-600 hover:shadow-sm transition-all text-sm font-medium"
            >
              {word}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
