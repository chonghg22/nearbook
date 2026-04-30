'use client'

interface Filters {
  sort: string
  category: string
  availableOnly: boolean
}

interface Props {
  current: Filters
  onChange: (filters: Record<string, string>) => void
}

const CATEGORIES = [
  { value: '', label: '전체' },
  { value: 'novel', label: '소설' },
  { value: 'essay', label: '에세이' },
  { value: 'nonfiction', label: '비문학' },
  { value: 'children', label: '어린이' },
]

const SORTS = [
  { value: 'relevance', label: '관련도순' },
  { value: 'popular', label: '인기순' },
  { value: 'recent', label: '최신순' },
]

export function FilterPanel({ current, onChange }: Props) {
  const update = (key: string, value: string) => {
    onChange({ ...current, availableOnly: String(current.availableOnly), [key]: value })
  }

  return (
    <div className="flex flex-wrap gap-3 my-4 pb-4 border-b">
      <select
        value={current.category}
        onChange={(e) => update('category', e.target.value)}
        className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
      >
        {CATEGORIES.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>

      <select
        value={current.sort}
        onChange={(e) => update('sort', e.target.value)}
        className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
      >
        {SORTS.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={current.availableOnly}
          onChange={(e) =>
            onChange({ ...current, availableOnly: String(e.target.checked) })
          }
          className="rounded"
        />
        대출 가능만
      </label>
    </div>
  )
}
