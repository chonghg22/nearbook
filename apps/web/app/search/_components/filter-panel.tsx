'use client'

type Props = {
  category: string
  sort: string
  availableOnly: boolean
  onChange: (key: string, value: string | null) => void
}

export function FilterPanel({ category, sort, availableOnly, onChange }: Props) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <select
        value={category}
        onChange={(e) => onChange('category', e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="카테고리"
      >
        <option value="all">전체</option>
        <option value="novel">소설</option>
        <option value="essay">에세이</option>
        <option value="children">어린이</option>
        <option value="comics">만화</option>
      </select>

      <select
        value={sort}
        onChange={(e) => onChange('sort', e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="정렬"
      >
        <option value="relevance">관련도순</option>
        <option value="popular">인기순</option>
        <option value="recent">최신순</option>
      </select>

      <label className="flex items-center gap-2 text-sm text-gray-700 select-none cursor-pointer">
        <input
          type="checkbox"
          checked={availableOnly}
          onChange={(e) => onChange('availableOnly', e.target.checked ? '1' : null)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        대출 가능만
      </label>
    </div>
  )
}
