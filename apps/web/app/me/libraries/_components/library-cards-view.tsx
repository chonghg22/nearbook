'use client'
import { useState } from 'react'
import { MapPin, ExternalLink, Trash2 } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'

interface LibraryCard {
  id: number
  libraryId: number
  nickname: string | null
  isDefault: boolean
  library: {
    name: string
    address: string
    lat: number
    lng: number
    homepage: string | null
  }
}

interface Props {
  cards: LibraryCard[]
  plan: string
}

export function LibraryCardsView({ cards: initial, plan }: Props) {
  const [cards, setCards] = useState(initial)

  async function handleRemove(id: number) {
    const res = await apiFetch(`/library-cards/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCards((prev) => prev.filter((c) => c.id !== id))
    }
  }

  function getNaverMapUrl(lat: number, lng: number, name: string) {
    return `https://map.naver.com/p/search/${encodeURIComponent(name)}?c=${lng},${lat},15,0,0,0,dh`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">내 도서관</h2>
        <span className="text-sm text-gray-500">
          {cards.length}
          {plan === 'free' ? ' / 1' : ''}개
        </span>
      </div>

      {cards.length === 0 && (
        <p className="text-gray-400 text-sm py-8 text-center">
          등록한 도서관이 없습니다.
        </p>
      )}

      <ul className="space-y-3">
        {cards.map((card) => (
          <li key={card.id} className="p-4 border rounded-lg bg-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">
                  {card.isDefault && (
                    <span className="text-yellow-500 mr-1">⭐</span>
                  )}
                  {card.nickname ?? card.library.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <MapPin size={12} />
                  {card.library.address}
                </p>
              </div>

              <button
                onClick={() => handleRemove(card.id)}
                aria-label="도서관 제거"
                className="p-1.5 text-gray-400 hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex gap-2 mt-3">
              <a
                href={getNaverMapUrl(
                  card.library.lat,
                  card.library.lng,
                  card.library.name
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
              >
                길찾기 <ExternalLink size={11} />
              </a>
              {card.library.homepage && (
                <a
                  href={card.library.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:underline flex items-center gap-0.5"
                >
                  홈페이지 <ExternalLink size={11} />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>

      {plan === 'free' && cards.length >= 1 && (
        <div className="mt-6 p-4 border border-dashed border-blue-200 rounded-lg text-center">
          <p className="text-sm text-gray-600">
            Pro로 업그레이드하면 도서관 무제한 등록
          </p>
          <button className="mt-2 text-sm text-blue-600 font-medium hover:underline">
            Pro 알아보기 →
          </button>
        </div>
      )}
    </div>
  )
}
