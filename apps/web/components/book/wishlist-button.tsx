'use client'
import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface Props {
  isbn: string
  initialAdded?: boolean
}

export function WishlistButton({ isbn, initialAdded = false }: Props) {
  const [added, setAdded] = useState(initialAdded)
  const [loading, setLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [showNotificationNudge, setShowNotificationNudge] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    apiFetch(`/me/wishlists/${isbn}/status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.data?.added != null) {
          setAdded(Boolean(json.data.added))
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isbn])

  function showToast(msg: string) {
    setToastMsg(msg)
    setShowNotificationNudge(false)
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
          setToastMsg('위시리스트에 추가됨')
          setShowNotificationNudge(true)
          setTimeout(() => {
            setToastMsg(null)
            setShowNotificationNudge(false)
          }, 3500)
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
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all duration-200',
          added
            ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100'
            : 'bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-primary shadow-card',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <Heart
          size={16}
          fill={added ? 'currentColor' : 'none'}
          className={cn('shrink-0 transition-transform duration-300', added && 'scale-110')}
        />
        {added ? '찜됨' : '찜하기'}
      </button>

      {toastMsg && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-foreground text-canvas text-2xs px-3 py-1.5 rounded-md shadow-card-md whitespace-nowrap z-50 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-2">
            <span>{toastMsg}</span>
            {showNotificationNudge && (
              <Link href="/me/notifications" className="underline underline-offset-2">
                매일 아침 알림 변경하기
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
