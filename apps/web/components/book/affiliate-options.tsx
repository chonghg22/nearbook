'use client'

import useSWR from 'swr'
import { trackEvent } from '@/lib/analytics'
import { PUBLIC_API_BASE_URL } from '@/lib/constants'

type AffiliateProvider = 'aladin' | 'aladin-used' | 'millie' | 'ridi' | 'welaaa'

interface AffiliateItem {
  provider: AffiliateProvider
  type: 'new' | 'used' | 'ebook' | 'audiobook'
  price: number | null
  url: string
  available: boolean
}

const PROVIDER_INFO: Record<AffiliateProvider, { name: string; icon: string }> = {
  aladin: { name: '알라딘 신간', icon: '📖' },
  'aladin-used': { name: '알라딘 중고', icon: '📚' },
  millie: { name: '밀리의서재', icon: '📱' },
  ridi: { name: '리디', icon: '📱' },
  welaaa: { name: '윌라 오디오북', icon: '🎧' },
}

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  ebook: { label: '전자책', className: 'bg-blue-100 text-blue-700' },
  audiobook: { label: '오디오북', className: 'bg-purple-100 text-purple-700' },
}

async function fetchAffiliates(isbn: string): Promise<AffiliateItem[]> {
  const res = await fetch(`${PUBLIC_API_BASE_URL}/books/${isbn}/affiliates`)
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

function logAffiliateClick(isbn: string, provider: string) {
  trackEvent('affiliate_click', { isbn, provider })
}

export function AffiliateOptions({ isbn }: { isbn: string }) {
  const { data: options, isLoading } = useSWR<AffiliateItem[]>(
    isbn ? `affiliates-${isbn}` : null,
    () => fetchAffiliates(isbn),
    { revalidateOnFocus: false },
  )

  if (isLoading) {
    return (
      <section className="my-6 rounded-lg bg-gray-50 p-4 animate-pulse">
        <div className="mb-3 h-4 w-32 rounded bg-gray-200" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded bg-gray-200" />
          ))}
        </div>
      </section>
    )
  }

  if (!options?.length) return null

  function handleClick(provider: AffiliateProvider, url: string) {
    logAffiliateClick(isbn, provider)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="my-6 rounded-lg bg-gray-50 p-4">
      <h3 className="mb-1 font-bold">💡 다른 옵션</h3>
      <p className="mb-3 text-xs text-gray-500">
        ※ 클릭 시 후원금이 발생하며, 가격은 동일합니다.
      </p>
      <ul className="space-y-2">
        {options
          .filter((opt) => opt.available)
          .map((opt, i) => {
            const info = PROVIDER_INFO[opt.provider]
            const badge = TYPE_BADGE[opt.type]

            return (
              <li key={i}>
                <button
                  onClick={() => handleClick(opt.provider, opt.url)}
                  className="flex w-full items-center justify-between rounded-lg border bg-white p-3 text-sm transition-colors hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2">
                    <span>{info?.icon}</span>
                    <span className="font-medium">{info?.name}</span>
                    {badge && (
                      <span className={`rounded px-2 py-0.5 text-xs ${badge.className}`}>
                        {badge.label}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-blue-600">
                    {opt.price != null ? `₩${opt.price.toLocaleString()}` : '바로가기'} →
                  </span>
                </button>
              </li>
            )
          })}
      </ul>
    </section>
  )
}
