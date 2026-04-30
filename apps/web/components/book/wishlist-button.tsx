'use client'
import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/use-user'
import { apiFetch } from '@/lib/api-client'

export function WishlistButton({ isbn, initialAdded = false }: { isbn: string; initialAdded?: boolean }) {
  const [added, setAdded] = useState(initialAdded)
  const [loading, setLoading] = useState(false)
  const { user } = useUser()
  const router = useRouter()

  async function handleClick() {
    if (!user) {
      router.push(`/login?next=/book/${isbn}`)
      return
    }

    setLoading(true)
    try {
      if (added) {
        await apiFetch(`/wishlists/${isbn}`, { method: 'DELETE' })
        setAdded(false)
      } else {
        const res = await apiFetch('/wishlists', {
          method: 'POST',
          body: JSON.stringify({ isbn }),
        })
        if (res.status === 403) {
          alert('Free 플랜은 위시리스트 10개 한도입니다. Pro로 업그레이드하세요.')
          return
        }
        setAdded(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
        added
          ? 'bg-red-50 border-red-300 text-red-600'
          : 'bg-white border-gray-300 text-gray-700 hover:border-red-300'
      }`}
    >
      <Heart size={18} fill={added ? 'currentColor' : 'none'} />
      {added ? '찜됨' : '찜하기'}
    </button>
  )
}
