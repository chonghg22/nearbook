'use client'

import { cn } from '@/lib/utils'

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
  { value: '', label: '카테고리: 전체' },
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
    <div className="flex flex-wrap items-center gap-3 my-4 pb-6 border-b border-border">
      <div className="relative group">
        <select
          value={current.category}
          onChange={(e) => update('category', e.target.value)}
          className="appearance-none bg-white border border-border rounded-lg px-3 py-1.5 pr-8
                     text-xs font-medium text-foreground hover:border-primary/50 transition-colors
                     shadow-card focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <div className="relative group">
        <select
          value={current.sort}
          onChange={(e) => update('sort', e.target.value)}
          className="appearance-none bg-white border border-border rounded-lg px-3 py-1.5 pr-8
                     text-xs font-medium text-foreground hover:border-primary/50 transition-colors
                     shadow-card focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {SORTS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          checked={current.availableOnly}
          onChange={(e) =>
            onChange({ ...current, availableOnly: String(e.target.checked) })
          }
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30 transition-colors"
        />
        대출 가능만
      </label>
    </div>
  )
}
