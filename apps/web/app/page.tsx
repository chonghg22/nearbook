import { HeroSection } from './_components/hero-section'
import { BookListSection } from './_components/book-list-section'
import { LibrariesNearMe } from './_components/libraries-near-me'

export const revalidate = 86400 // 1일

const API = process.env.INTERNAL_API_URL || 'http://localhost:3001'

async function safeFetch(url: string) {
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) {
      console.warn(`Fetch failed for ${url}: ${res.status} ${res.statusText}`)
      return { data: [] }
    }
    return res.json()
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error)
    return { data: [] }
  }
}

export default async function HomePage() {
  const [popular, newBooks, libraries] = await Promise.all([
    safeFetch(`${API}/books/popular?region=전국&limit=10`),
    safeFetch(`${API}/books/recent?limit=10`),
    safeFetch(`${API}/libraries/popular?limit=8`),
  ])

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "url": process.env.NEXT_PUBLIC_SITE_URL ?? "https://우리동네책.kr",
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://우리동네책.kr"}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection />
      
      <div className="space-y-8 pb-20">
        <BookListSection 
          title="🔥 이번 주 인기 도서" 
          items={popular.data ?? []} 
          viewAllHref="/popular"
        />
        
        <BookListSection 
          title="🆕 이번 주 신간" 
          items={newBooks.data ?? []} 
          viewAllHref="/recent"
        />
        
        <LibrariesNearMe fallbackLibraries={libraries.data ?? []} />
      </div>

      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">우리 동네 도서관을 더 가깝게</h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            전국 1,400개 이상의 공공도서관 데이터를 통합하여<br />
            내가 읽고 싶은 책이 지금 어디에 있는지, 바로 빌릴 수 있는지 알려드립니다.
          </p>
        </div>
      </section>
    </main>
  )
}

export const metadata = {
  title: '우리동네책 | 한국 공공도서관 통합 책 검색',
  description: '전국 1,400+ 공공도서관에서 책을 빠르게 찾고 빌리세요. 위치 기반 도서관 매칭, 보유 여부 확인.',
  openGraph: {
    title: '우리동네책',
    description: '우리 동네 도서관에서 책 빌리기',
    type: 'website',
  },
}
