'use client'

type Props = {
  searchType: string
  sort: string
  onChange: (key: string, value: string | null) => void
}

export function FilterPanel({ searchType, sort, onChange }: Props) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <select
        value={searchType}
        onChange={(e) => onChange('searchType', e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="검색 유형"
      >
        <option value="title">도서명</option>
        <option value="author">저자명</option>
        <option value="isbn">ISBN</option>
        <option value="publisher">출판사</option>
      </select>

      <select
        value={sort}
        onChange={(e) => onChange('sort', e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="정렬"
      >
        <option value="relevance">관련도순</option>
        <option value="popular">인기순</option>
        <option value="recent">최신순</option>
      </select>
    </div>
  )
}
