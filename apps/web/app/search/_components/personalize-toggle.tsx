'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export function PersonalizeToggle({ sort }: { sort?: string }) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isDisabled = !!sort && sort !== 'relevance'
  const isOn = !isDisabled && params.get('personalize') !== '0'

  function handleToggle() {
    if (isDisabled) return
    const next = new URLSearchParams(params.toString())
    if (isOn) {
      next.set('personalize', '0')
    } else {
      next.delete('personalize')
    }
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isDisabled}
      className={`
        inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-colors
        ${isOn ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-600'}
        ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-blue-100'}
      `}
      title={isDisabled ? '명시 정렬 사용 중에는 비활성화됩니다' : ''}
    >
      {isOn && <span>&#10003;</span>}
      <span>내 도서관 우선</span>
    </button>
  )
}
