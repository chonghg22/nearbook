'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

type Props = {
  defaultValue: string
  onSubmit: (q: string) => void
}

export function SearchBar({ defaultValue, onSubmit }: Props) {
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(value)
      }}
      className="flex gap-2"
      role="search"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="책 제목, 저자 검색"
        className="flex-1 px-4 h-14 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        aria-label="검색어"
      />
      <button
        type="submit"
        aria-label="검색"
        className="w-14 h-14 bg-primary hover:bg-primary-700 text-white rounded-lg flex items-center justify-center transition-colors"
      >
        <Search className="w-5 h-5" strokeWidth={2.5} />
      </button>
    </form>
  )
}
