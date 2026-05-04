'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useDebounce } from 'use-debounce'
import useSWR from 'swr'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'

interface Props {
  defaultValue?: string
  autoFocus?: boolean
  placeholder?: string
  onSubmitted?: () => void
  className?: string
}

interface Suggestion {
  isbn: string
  title: string
  author: string
  coverUrl?: string
}

export function SearchBar({
  defaultValue = '',
  autoFocus = false,
  placeholder = '책 제목, 저자, ISBN 검색',
  onSubmitted,
  className,
}: Props) {
  const router = useRouter()
  const [q, setQ] = useState(defaultValue)
  const [debounced] = useDebounce(q, 300)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: suggestions, isLoading } = useSWR<{ data: Suggestion[] }>(
    debounced.length >= 2
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/search/suggest?q=${encodeURIComponent(debounced)}`
      : null,
    (url: string) => fetch(url).then((r) => r.json())
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    router.push(`/search?q=${encodeURIComponent(q.trim())}`)
    setIsOpen(false)
    onSubmitted?.()
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form onSubmit={handleSubmit} className="relative group">
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="책 제목·저자·ISBN 검색"
          className="w-full h-12 pl-12 pr-14 rounded-full border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            className="absolute right-14 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 transition"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition flex items-center justify-center shadow-sm"
        >
          <Search className="w-5 h-5" />
        </button>
      </form>

      {isOpen && suggestions?.data && suggestions.data.length > 0 && (
        <ul
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
        >
          {suggestions.data.map((item) => (
            <li key={item.isbn} role="option" aria-selected={false}>
              <Link
                href={`/book/${item.isbn}`}
                onClick={() => {
                  setIsOpen(false)
                  onSubmitted?.()
                }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition"
              >
                <div className="w-10 h-14 bg-gray-100 rounded overflow-hidden flex-shrink-0 relative">
                  {item.coverUrl ? (
                    <Image
                      src={item.coverUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 text-center">
                      No Image
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 truncate">{item.author}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
