import { LibrariesMapSection } from './_components/libraries-map-section'
import { HomeHero } from './_components/home-hero'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-canvas">
      <HomeHero />
      <LibrariesMapSection />
      {/* TODO Step 3: 나머지 홈페이지 구현 (인기 도서 등) */}
    </main>
  )
}
