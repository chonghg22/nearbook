import { BookCard } from '@/components/book/book-card'
import type { Status } from '@/components/ui/status-badge'

// AdSenseSlot은 Step 12에서 실제 구현. 지금은 placeholder.
function AdSenseSlot({ slot }: { slot: string }) {
  return (
    <div className="my-6 h-20 bg-canvas-subtle rounded-lg border border-border border-dashed flex items-center justify-center text-xs text-muted-foreground">
      [광고 슬롯: {slot}]
    </div>
  )
}

interface Item {
  isbn: string
  title: string
  author: string
  publisher: string | null
  coverUrl: string | null
  libraryHoldings: number
  loanAvailable: number
}

interface Props {
  isLoading: boolean
  items?: Item[]
  suggestions?: string[]
  trending?: string[]
}

export function ResultList({ isLoading, items, suggestions, trending }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3 mt-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 bg-canvas-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="mt-16 text-center">
        <p className="text-3xl mb-4">😔</p>
        <p className="font-semibold text-lg text-foreground mb-4">검색 결과가 없어요.</p>
        <ul className="text-sm text-muted-foreground space-y-1.5 mb-8">
          <li>검색어 철자를 확인해 보세요</li>
          <li>더 짧은 단어로 검색해 보세요</li>
          <li>저자명만 검색해 보세요</li>
        </ul>
        {suggestions && suggestions.length > 0 && (
          <div className="page-padding">
            <p className="text-sm font-medium text-muted-foreground mb-3">이런 책은 어때요?</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map(s => (
                <a
                  key={s}
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="text-sm text-primary bg-white border border-border rounded-full px-4 py-1.5 hover:border-primary/50 transition-colors shadow-card"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3 mt-6">
      {items.map((item, i) => {
        const status: Status = item.loanAvailable > 0 ? 'available' : 'unavailable'
        return (
          <div key={item.isbn}>
            <BookCard
              isbn={item.isbn}
              title={item.title}
              author={item.author}
              publisher={item.publisher ?? undefined}
              coverUrl={item.coverUrl ?? undefined}
              availableCount={item.loanAvailable}
              totalCount={item.libraryHoldings}
              status={status}
            />
            {/* 4번째 결과 아래 AdSense 인피드 */}
            {i === 3 && <AdSenseSlot key="ad" slot="search-infeed" />}
          </div>
        )
      })}
    </div>
  )
}
