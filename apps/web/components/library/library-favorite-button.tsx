'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface Props {
  libraryId: number
  initialAdded?: boolean
}

export function LibraryFavoriteButton({
  libraryId,
  initialAdded = false,
}: Props) {
  const [added, setAdded] = useState(initialAdded)
  const [loading, setLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setAdded(initialAdded)
  }, [initialAdded, libraryId])

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  async function handleClick() {
    setLoading(true)

    try {
      if (added) {
        const res = await apiFetch(`/library-cards/by-library/${libraryId}`, {
          method: 'DELETE',
        })

        if (res.ok) {
          setAdded(false)
          showToast('즐겨찾기 도서관에서 제거됨')
        }
        return
      }

      const res = await apiFetch('/library-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libraryId }),
      })

      if (res.status === 401) {
        showToast('로그인이 필요합니다')
        setTimeout(() => router.push(`/login?next=/library/${libraryId}`), 1500)
        return
      }

      if (res.status === 403) {
        showToast('무료 플랜은 도서관 1개만 등록할 수 있습니다')
        return
      }

      if (res.ok) {
        setAdded(true)
        showToast('즐겨찾기 도서관에 추가됨')
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
        aria-label={added ? '즐겨찾기 도서관에서 제거' : '즐겨찾기 도서관에 추가'}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all duration-200',
          added
            ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
            : 'bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-primary shadow-card',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        <Star
          size={16}
          fill={added ? 'currentColor' : 'none'}
          className={cn('shrink-0 transition-transform duration-300', added && 'scale-110')}
        />
        {added ? '즐겨찾기됨' : '즐겨찾기'}
      </button>

      {toastMsg && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-foreground text-canvas text-2xs px-3 py-1.5 rounded-md shadow-card-md whitespace-nowrap z-50 animate-in fade-in zoom-in duration-200">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
