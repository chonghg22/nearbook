'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'

interface WishItem {
  isbn: string
  title: string | null
  author: string | null
  coverUrl: string | null
  addedAt: string
  note: string | null
}

interface Props {
  items: WishItem[]
  plan: string
  total: number
}

export function WishlistView({ items: initial, plan, total }: Props) {
  const [items, setItems] = useState(initial)
  const limit = plan === 'free' ? 10 : null

  async function handleRemove(isbn: string) {
    const res = await apiFetch(`/wishlists/${isbn}`, { method: 'DELETE' })
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.isbn !== isbn))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">내 위시리스트</h2>
        <span className="text-sm text-gray-500">
          {items.length}
          {limit ? ` / ${limit}` : ''}권
          {plan === 'free' && items.length >= 10 && (
            <span className="ml-2 text-red-500 text-xs">
              한도 도달 — Pro로 무제한 →
            </span>
          )}
        </span>
      </div>

      {items.length === 0 && (
        <p className="text-gray-400 text-sm py-8 text-center">
          아직 위시리스트가 비어 있습니다.
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.isbn}
            className="flex gap-3 p-3 border rounded-lg bg-white"
          >
            <Link href={`/book/${item.isbn}`} className="shrink-0">
              {item.coverUrl ? (
                <Image
                  src={item.coverUrl}
                  alt={item.title ?? ''}
                  width={56}
                  height={80}
                  className="object-cover rounded"
                />
              ) : (
                <div className="w-14 h-20 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                  표지 없음
                </div>
              )}
            </Link>

            <div className="flex-1 min-w-0">
              <Link
                href={`/book/${item.isbn}`}
                className="font-medium text-sm hover:underline line-clamp-1"
              >
                {item.title ?? '(제목 없음)'}
              </Link>
              <p className="text-xs text-gray-500 mt-0.5">{item.author}</p>
              {item.note && (
                <p className="text-xs text-gray-400 mt-1 italic">
                  &quot;{item.note}&quot;
                </p>
              )}
              <p className="text-xs text-gray-300 mt-1">
                {new Date(item.addedAt).toLocaleDateString('ko-KR')} 추가
              </p>
            </div>

            <button
              onClick={() => handleRemove(item.isbn)}
              aria-label="위시리스트에서 제거"
              className="p-1.5 text-gray-400 hover:text-red-500 shrink-0 self-start"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>

      {plan === 'free' && (
        <div className="mt-6 p-4 border border-dashed border-blue-200 rounded-lg text-center">
          <p className="text-sm text-gray-600">
            Pro로 업그레이드하면 위시리스트 무제한
          </p>
          <button className="mt-2 text-sm text-blue-600 font-medium hover:underline">
            Pro 알아보기 →
          </button>
        </div>
      )}
    </div>
  )
}
