'use client'
import { useEffect, useRef, useState } from 'react'
import { publicApiJson } from '@/lib/public-api-client'
import { parseLibrarySearch } from '@/lib/api-contracts'

export function SavedLibrarySearch({
  disabled,
  onAdd,
}: {
  disabled: boolean
  onAdd: (libraryId: number) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ReturnType<typeof parseLibrarySearch>['data'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [])
  async function search(event: React.FormEvent) {
    event.preventDefault()
    if (disabled || loading || query.trim().length < 2) return
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    setLoading(true)
    setError(false)
    setResults(null)
    try {
      const response = await publicApiJson(
        `/libraries?q=${encodeURIComponent(query.trim())}&limit=10`,
        parseLibrarySearch,
        { signal: controller.signal }
      )
      if (!controller.signal.aborted) setResults(response.data)
    } catch {
      if (!controller.signal.aborted) setError(true)
    } finally {
      if (active.current === controller && !controller.signal.aborted) setLoading(false)
    }
  }
  return (
    <section aria-label="내 도서관 등록" className="my-5 rounded-xl border bg-white p-4">
      <h3 className="font-semibold">도서관 찾아 등록하기</h3>
      <p className="my-2 text-xs text-muted-foreground">
        첫 도서관은 기본 도서관으로 등록됩니다. 검색하거나 보기만 해서는 설정이 저장되지 않습니다.
      </p>
      <form
        role="search"
        aria-label="등록할 도서관 검색"
        onSubmit={search}
        className="flex min-w-0 flex-wrap gap-2"
      >
        <input
          value={query}
          disabled={disabled}
          onChange={(event) => {
            active.current?.abort()
            setQuery(event.target.value)
            setResults(null)
            setError(false)
            setLoading(false)
          }}
          aria-label="등록할 도서관 이름"
          placeholder="도서관 이름 두 글자 이상"
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-base"
        />
        <button
          type="submit"
          disabled={disabled || loading || query.trim().length < 2}
          className="rounded-full border px-4 py-2 disabled:opacity-50"
        >
          도서관 찾기
        </button>
      </form>
      {loading && (
        <p role="status" className="mt-3 text-sm">
          도서관을 찾는 중…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          도서관 검색을 불러오지 못했습니다. 같은 검색으로 다시 시도해 주세요.
        </p>
      )}
      {results?.length === 0 && (
        <p className="mt-3 text-sm">해당하는 도서관이 없습니다. 다른 이름으로 검색해 주세요.</p>
      )}
      {results && (
        <ul className="mt-3 space-y-2">
          {results.map((library) => (
            <li
              key={library.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div className="min-w-0 [overflow-wrap:anywhere]">
                <p className="text-sm font-medium">{library.name}</p>
                <p className="text-xs text-muted-foreground">{library.address}</p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onAdd(library.id)}
                aria-label={`${library.name} 내 도서관에 등록`}
                className="rounded-full border px-4 py-2 text-sm disabled:opacity-50"
              >
                등록
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
