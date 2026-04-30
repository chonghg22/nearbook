'use client'

import { useState, useRef, useEffect } from 'react'
import { useDebounce } from 'use-debounce'
import useSWR from 'swr'
import { Search } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

interface Props {
  defaultValue: string
  onSubmit: (q: string) => void
}

export function SearchBar({ defaultValue, onSubmit }: Props) {
  const [q, setQ] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [debounced] = useDebounce(q, 300)
  const ref = useRef<HTMLDivElement>(null)

  const { data } = useSWR(
    debounced.length >= 2
      ? `${API_BASE}/search/suggest?q=${encodeURIComponent(debounced)}`
      : null,
    fetcher,
  )
  const suggestions: Array<{ isbn: string; title: string; author: string }> =
    data?.data ?? []

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setOpen(false)
          onSubmit(q)
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          placeholder="책 제목·저자 검색"
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <button
          type="submit"
          className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          aria-label="검색"
        >
          <Search size={20} />
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <ul className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s.isbn}>
              <button
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                onClick={() => {
                  setQ(s.title)
                  setOpen(false)
                  onSubmit(s.title)
                }}
              >
                <div className="font-medium text-sm text-gray-900">{s.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.author}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
