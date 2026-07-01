import { HeroSection } from './_components/hero-section'
import { BookListSection } from './_components/book-list-section'
import { LibrariesNearMe } from './_components/libraries-near-me'
import { AboutSection } from './_components/about-section'
import { AdSenseSlot } from './_components/adsense-slot'

export const revalidate = 60 // 1분 (데이터 안정화 후 3600으로 복원)

const API = process.env.INTERNAL_API_URL || 'http://localhost:3001'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.near-book.com'
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
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) {
      console.warn(`[safeFetch] ${res.status} ${res.statusText} → ${url}`)
      return { data: [] }
    }
    const json = await res.json()
    console.log(`[safeFetch] OK ${url} → ${json.data?.length ?? 0} items`)
    return json
  } catch (error) {
    console.error(`[safeFetch] ERROR ${url}:`, error)
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
    "url": SITE_URL,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection monthlyKeywords={monthlyKeywords.data?.length ? monthlyKeywords.data : MONTHLY_KEYWORDS_FALLBACK} />
      
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
          viewAllHref="/rising"
        />
      </div>

      <AboutSection />
      <AdSenseSlot
        slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_FOOTER}
        label="홈 하단 광고"
      />
    </main>
  )
}

export const metadata = {
  title: '우리동네책 | 한국 공공도서관 통합 책 검색',
  description: '전국 1,400+ 공공도서관에서 책 보유 여부와 대출 가능성을 빠르게 확인하세요. 위치 기반 도서관 매칭을 제공합니다.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '우리동네책',
    description: '책 제목으로 가까운 공공도서관 보유 여부 확인',
    type: 'website',
  },
}
