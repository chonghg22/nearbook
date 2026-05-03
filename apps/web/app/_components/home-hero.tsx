'use client'

import { useRouter } from 'next/navigation'
import { SearchBar } from '@/app/search/_components/search-bar'

export function HomeHero() {
  const router = useRouter()

  const handleSearch = (q: string) => {
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <section className="bg-gradient-to-b from-canvas-subtle to-canvas px-4 pt-10 pb-8 -mx-4 md:-mx-6 lg:-mx-8">
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                        bg-primary/10 text-primary text-xs font-medium mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          전국 1,400+ 공공도서관 통합 검색
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight text-balance">
          읽고 싶은 책,<br />
          <span className="text-primary">우리 동네 도서관</span>에 있나요?
        </h1>
        <p className="mt-3 text-base text-muted-foreground text-pretty max-w-md">
          책 제목만 검색하면 근처 도서관에서 바로 빌릴 수 있는지 알려드려요.
        </p>
        <div className="mt-6 max-w-xl">
          <SearchBar defaultValue="" onSubmit={handleSearch} size="lg" />
        </div>
      </div>
    </section>
  )
}
