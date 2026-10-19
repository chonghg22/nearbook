'use client'

import { useState, useEffect, useRef, useId } from 'react'
import { useRouter } from 'next/navigation'
import { useDebounce } from 'use-debounce'
import useSWR from 'swr'
import { Camera, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { publicApiJson } from '@/lib/public-api-client'
import { parseSuggestions } from '@/lib/api-contracts'
import { trackEvent } from '@/lib/analytics'
import { searchSubmission } from '@/lib/analytics-events'

interface Props {
  defaultValue?: string
  autoFocus?: boolean
  placeholder?: string
  onSubmitted?: () => void
  className?: string
  formLabel?: string
  inlineSuggestions?: boolean
  analyticsSource?: 'header' | 'mobile_header' | 'home'
}

export function SearchBar({
  defaultValue = '',
  autoFocus = false,
  placeholder = '책 제목, 저자, ISBN 검색',
  onSubmitted,
  className,
  formLabel = '도서 검색',
  inlineSuggestions = false,
  analyticsSource = 'header',
}: Props) {
  const router = useRouter()
  const [q, setQ] = useState(defaultValue)
  const [debounced] = useDebounce(q, 300)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const composing = useRef(false)
  const listId = useId()
  const [activeIsbn, setActiveIsbn] = useState<string | null>(null)

  const { data: suggestions, error: suggestionError } = useSWR(
    debounced.length >= 2 ? `/search/suggest?q=${encodeURIComponent(debounced)}` : null,
    (path: string) => publicApiJson(path, parseSuggestions),
    { shouldRetryOnError: false }
  )
  // Do not select a result from the previous debounced query while the user is typing.
  const currentQuery = q === debounced && q.trim().length >= 2
  const items = currentQuery && !suggestionError ? (suggestions?.data ?? []) : []
  const expanded = isOpen && items.length > 0
  const activeIndex = expanded ? items.findIndex((item) => item.isbn === activeIsbn) : -1
  const activeId = activeIndex >= 0 ? `${listId}-${items[activeIndex]!.isbn}` : undefined

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' })
  }, [activeId])

  useEffect(() => {
    setQ(defaultValue)
    setActiveIsbn(null)
    setIsOpen(false)
  }, [defaultValue])

  function closeSuggestions() {
    setIsOpen(false)
    setActiveIsbn(null)
  }

  function selectBook(isbn: string) {
    trackEvent('book_result_click', {
      ...searchSubmission(q, 'all', analyticsSource), isbn,
      surface: 'suggestion', rank: items.findIndex((item) => item.isbn === isbn) + 1,
    })
    router.push(`/book/${encodeURIComponent(isbn)}`)
    closeSuggestions()
    onSubmitted?.()
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeSuggestions()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (composing.current || !q.trim()) return
    trackEvent('search_submit', searchSubmission(q, 'all', analyticsSource))
    router.push(`/search?q=${encodeURIComponent(q.trim())}`)
    closeSuggestions()
    onSubmitted?.()
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full min-w-0', className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) closeSuggestions()
      }}
    >
      <form role="search" aria-label={formLabel} onSubmit={handleSubmit} className="relative group">
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setActiveIsbn(null)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onCompositionStart={() => {
            composing.current = true
            setActiveIsbn(null)
          }}
          onCompositionEnd={() => {
            composing.current = false
          }}
          onKeyDown={(event) => {
            if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return
            if (
              event.key === 'Escape' &&
              (expanded || (isOpen && currentQuery && suggestionError))
            ) {
              event.preventDefault()
              event.stopPropagation()
              closeSuggestions()
            } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && items.length) {
              event.preventDefault()
              setIsOpen(true)
              const next =
                event.key === 'ArrowDown'
                  ? Math.min(activeIndex + 1, items.length - 1)
                  : activeIndex < 0
                    ? items.length - 1
                    : Math.max(0, activeIndex - 1)
              setActiveIsbn(items[next]!.isbn)
            } else if (event.key === 'Enter' && activeIndex >= 0) {
              event.preventDefault()
              selectBook(items[activeIndex]!.isbn)
            } else if (event.key === 'Tab') closeSuggestions()
          }}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="책 제목·저자·ISBN 검색"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-activedescendant={activeId}
          autoComplete="off"
          enterKeyHint="search"
          className="w-full h-12 pl-10 pr-36 md:pr-24 text-base rounded-full border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ('')
              closeSuggestions()
              inputRef.current?.focus()
            }}
            aria-label="검색어 지우기"
            className="absolute right-[92px] md:right-12 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full hover:bg-gray-200 transition"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
        <Link
          href="/scan"
          className="absolute right-12 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-primary-300 hover:text-primary-600 md:hidden"
          aria-label="바코드 스캔"
        >
          <Camera className="h-4 w-4" />
        </Link>
        <button
          type="submit"
          aria-label="검색"
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-primary-500 text-white shadow-sm transition hover:bg-primary-600"
        >
          <Search className="w-5 h-5" />
        </button>
      </form>

      {isOpen && currentQuery && suggestionError && (
        <p
          role="status"
          className={cn(
            'mt-2 w-full rounded-xl border bg-white p-3 text-sm text-gray-500',
            !inlineSuggestions && 'absolute top-full z-50'
          )}
        >
          자동완성을 불러오지 못했습니다. 입력한 검색어로 검색할 수 있습니다.
        </p>
      )}
      {expanded && (
        <ul
          id={listId}
          role="listbox"
          aria-label="추천 도서"
          className={cn(
            'mt-2 max-h-[min(18rem,40dvh)] overflow-y-auto overscroll-contain bg-white rounded-2xl shadow-xl border border-gray-100 z-50',
            !inlineSuggestions && 'absolute top-full left-0 right-0'
          )}
        >
          {items.map((item) => (
            <li key={item.isbn} role="presentation">
              <button
                type="button"
                role="option"
                id={`${listId}-${item.isbn}`}
                aria-selected={activeIsbn === item.isbn}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectBook(item.isbn)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition',
                  activeIsbn === item.isbn && 'bg-primary-50 ring-2 ring-inset ring-primary-500'
                )}
              >
                <div className="w-10 h-14 bg-gray-100 rounded overflow-hidden flex-shrink-0 relative">
                  {item.coverUrl ? (
                    <Image src={item.coverUrl} alt="" fill className="object-cover" />
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
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
