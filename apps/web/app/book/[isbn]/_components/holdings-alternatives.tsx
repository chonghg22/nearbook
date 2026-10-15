'use client'

import Link from 'next/link'
import { LocationBar } from '@/components/location-bar'
import {
  alternativeEditionSearch,
  nextHoldingRadius,
  type HoldingRadius,
} from '@/lib/holdings-alternatives'

interface Props {
  bookTitle?: string | undefined
  radiusKm: HoldingRadius
  onRadiusChange: (radius: HoldingRadius) => void
}

const actionClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary-50'

export function HoldingsAlternatives({ bookTitle, radiusKm, onRadiusChange }: Props) {
  const nextRadius = nextHoldingRadius(radiusKm)
  const editions = alternativeEditionSearch(bookTitle)
  return (
    <section
      aria-label="책을 찾는 다른 방법"
      className="space-y-4 rounded-xl border border-primary-200 bg-primary-50/50 p-4 sm:p-5"
    >
      <div>
        <h3 className="font-semibold text-foreground">책을 찾는 다른 방법</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          다른 범위나 판본을 찾아보거나, 찜해 두고 나중에 다시 확인해 보세요.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {nextRadius ? (
          <button type="button" className={actionClass} onClick={() => onRadiusChange(nextRadius)}>
            {nextRadius}km로 넓혀보기
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">
            최대 반경 20km입니다. 더 먼 도서관은 기준 지역을 바꿔 찾아보세요.
          </p>
        )}
        {editions && (
          <Link href={editions} prefetch={false} className={actionClass}>
            같은 제목·다른 판본 검색
          </Link>
        )}
        <a href="#book-wishlist" className={actionClass}>
          이 책 찜하기로 이동
        </a>
        <Link href="/me/notifications" prefetch={false} className={actionClass}>
          찜한 책 알림 설정
        </Link>
        <Link href="/libraries" prefetch={false} className={actionClass}>
          다른 도서관 찾아보기
        </Link>
      </div>
      <LocationBar changeButtonLabel="다른 지역·도서관 선택" showDescription />
      <div className="space-y-1 text-xs leading-5 text-muted-foreground">
        <p>
          반경을 넓혀도 가까운 후보가 같으면 결과가 같을 수 있습니다. 최대 30곳의 후보 중 10곳만
          상태를 확인하며, 모든 도서관의 소장 여부를 확인한 결과는 아닙니다.
        </p>
        {editions && (
          <p>
            검색 결과의 제목·ISBN·큰글자/필사 표기를 비교해 주세요. 같은 제목이라고 같은 내용이나
            판본을 보장하지는 않습니다.
          </p>
        )}
        <p>
          찜·알림은 로그인이 필요할 수 있습니다. 찜하기와 알림 수신 여부·주기는 직접 설정하며, 즉시
          대출·예약을 보장하지 않습니다.
        </p>
        <p>
          도서관 카드의 ‘공식 사이트에서 확인’으로 최신 상태를 확인하세요. 카드가 없으면 다른
          도서관을 찾아 상세 페이지의 공식 사이트 정보를 확인해 주세요.
        </p>
      </div>
    </section>
  )
}
