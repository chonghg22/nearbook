import Link from 'next/link'
import Image from 'next/image'

// AdSenseSlot은 Step 12에서 실제 구현. 지금은 placeholder.
function AdSenseSlot({ slot }: { slot: string }) {
  return (
    <div className="my-4 h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
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
      <ul className="space-y-3 mt-4">
        {[...Array(5)].map((_, i) => (
          <li key={i} className="h-24 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </ul>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="mt-12 text-center text-gray-500">
        <p className="text-2xl mb-2">😔</p>
        <p className="font-medium mb-4">검색 결과가 없어요.</p>
        <ul className="text-sm space-y-1 mb-6">
          <li>검색어 철자를 확인해 보세요</li>
          <li>더 짧은 단어로 검색해 보세요</li>
          <li>저자명만 검색해 보세요</li>
        </ul>
        {suggestions && suggestions.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">이런 책은 어때요?</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map(s => (
                <Link
                  key={s}
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="text-sm text-blue-600 border border-blue-200 rounded-full px-3 py-1 hover:bg-blue-50"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <ul className="space-y-3 mt-4">
      {items.map((item, i) => (
        <div key={item.isbn}>
          <li>
            <Link
              href={`/book/${item.isbn}`}
              className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {item.coverUrl ? (
                <Image
                  src={item.coverUrl}
                  alt={item.title}
                  width={60}
                  height={90}
                  className="object-cover rounded flex-shrink-0"
                />
              ) : (
                <div className="w-15 h-22 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center text-xs text-gray-400">
                  표지 없음
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {item.author}
                  {item.publisher && ` · ${item.publisher}`}
                </p>
                <p className="text-sm text-blue-600 mt-2">
                  📚 {item.libraryHoldings}권 보유
                  {item.loanAvailable > 0 && (
                    <span className="ml-2 text-green-600">
                      ({item.loanAvailable}권 대출 가능)
                    </span>
                  )}
                </p>
              </div>
            </Link>
          </li>
          {/* 4번째 결과 아래 AdSense 인피드 */}
          {i === 3 && <AdSenseSlot key="ad" slot="search-infeed" />}
        </div>
      ))}
    </ul>
  )
}
