import { HeroSection } from './_components/hero-section'
import { BookListSection } from './_components/book-list-section'
import { LibrariesNearMe } from './_components/libraries-near-me'
import { AboutSection } from './_components/about-section'
import { AdSenseSlot } from './_components/adsense-slot'

export const revalidate = 86400 // 1일

const API = process.env.INTERNAL_API_URL || 'http://localhost:3001'
const MONTHLY_KEYWORDS_FALLBACK = [
  { word: '한강', weight: 0 },
  { word: '김애란', weight: 0 },
  { word: '불편한 편의점', weight: 0 },
  { word: '아몬드', weight: 0 },
  { word: '나미야 잡화점의 기적', weight: 0 },
  { word: '세이노의 가르침', weight: 0 },
  { word: '미움받을 용기', weight: 0 },
  { word: '베르나르 베르베르', weight: 0 },
  { word: '김호연', weight: 0 },
  { word: '채식주의자', weight: 0 },
]

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
  const [popular, loanItems, hotTrend, libraries, monthlyKeywords] = await Promise.all([
    safeFetch(`${API}/books/popular?region=전국&limit=10`),
    safeFetch(`${API}/books/loan-item?limit=10`),
    safeFetch(`${API}/books/hot-trend?limit=10`),
    safeFetch(`${API}/libraries/popular?limit=8`),
    safeFetch(`${API}/search/monthly-keywords?limit=10`),
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
      <HeroSection monthlyKeywords={monthlyKeywords.data ?? MONTHLY_KEYWORDS_FALLBACK} />
      
      <div className="space-y-8 pb-20">
        <LibrariesNearMe fallbackLibraries={libraries.data ?? []} />

        <BookListSection 
          title="🔥 이번 주 인기 도서" 
          items={popular.data ?? []} 
          viewAllHref="/popular"
        />
        
        <BookListSection 
          title="📖 인기대출도서" 
          items={loanItems.data ?? []} 
          viewAllHref="/popular"
        />

        <BookListSection 
          title="📈 대출 급상승도서" 
          items={hotTrend.data ?? []} 
          viewAllHref="/popular"
        />
      </div>

      <AboutSection />
      <AdSenseSlot slot="home-footer" />
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
