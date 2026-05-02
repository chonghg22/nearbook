'use client'
import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api-client'

interface Props {
  isbn: string
  initialAdded?: boolean
}

export function WishlistButton({ isbn, initialAdded = false }: Props) {
  const [added, setAdded] = useState(initialAdded)
  const [loading, setLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const router = useRouter()

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  async function handleClick() {
    setLoading(true)
    try {
      if (added) {
        const res = await apiFetch(`/wishlists/${isbn}`, { method: 'DELETE' })
        if (res.ok) {
          setAdded(false)
          showToast('위시리스트에서 제거됨')
        }
      } else {
        const res = await apiFetch('/wishlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isbn }),
        })

        if (res.status === 401) {
          showToast('로그인이 필요합니다')
          setTimeout(() => router.push(`/login?next=/book/${isbn}`), 1500)
          return
        }
        if (res.status === 403) {
          showToast('위시리스트 10권 초과 — Pro 업그레이드 필요')
          return
        }
        if (res.ok) {
          setAdded(true)
          showToast('위시리스트에 추가됨 ♥')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        disabled={loading}
        aria-label={added ? '위시리스트에서 제거' : '위시리스트에 추가'}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-colors
          ${
            added
              ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }
          disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Heart
          size={16}
          fill={added ? 'currentColor' : 'none'}
          className="shrink-0"
        />
        {added ? '찜됨' : '찜하기'}
      </button>

      {toastMsg && (
        <div className="absolute top-full mt-2 left-0 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap z-50">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
