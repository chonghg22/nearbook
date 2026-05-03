'use client'

import { useState, useRef, useEffect } from 'react'
import { useDebounce } from 'use-debounce'
import useSWR from 'swr'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

interface Props {
  defaultValue: string
  onSubmit: (q: string) => void
  placeholder?: string
  className?: string
  size?: 'default' | 'lg'
}

export function SearchBar({
  defaultValue,
  onSubmit,
  placeholder = '책 제목, 저자, ISBN 검색',
  className,
  size = 'default',
}: Props) {
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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    setOpen(false)
    onSubmit(q)
  }

  return (
    <div ref={ref} className={cn('relative group', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Search
          className={cn(
            'absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0 text-muted-foreground',
            'transition-colors group-focus-within:text-primary',
            size === 'lg' ? 'w-5 h-5' : 'w-4 h-4',
          )}
        />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          placeholder={placeholder}
          className={cn(
            'w-full bg-white border border-border rounded-full',
            'text-foreground placeholder:text-subtle-foreground',
            'shadow-input focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
            'transition-all duration-200',
            'pr-10',
            size === 'lg'
              ? 'pl-11 py-3.5 text-base'
              : 'pl-10 py-2.5 text-sm',
          )}
          aria-label={placeholder}
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ('')
              setOpen(false)
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2
                       text-muted-foreground hover:text-foreground
                       flex items-center justify-center w-5 h-5 min-h-0 min-w-0"
            aria-label="검색어 지우기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </form>

      {open && suggestions.length > 0 && (
        <ul className="absolute top-full mt-2 w-full bg-white border border-border rounded-lg shadow-card-md z-50 max-h-80 overflow-y-auto py-1">
          {suggestions.map((s) => (
            <li key={s.isbn}>
              <button
                type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-canvas-subtle transition-colors"
                onClick={() => {
                  setQ(s.title)
                  setOpen(false)
                  onSubmit(s.title)
                }}
              >
                <div className="font-medium text-sm text-foreground">{s.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.author}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
