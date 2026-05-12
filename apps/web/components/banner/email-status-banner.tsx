'use client'

import Link from 'next/link'

const messages: Record<string, string> = {
  bounced: '이메일을 보내지 못하고 있어요. 주소 또는 수신 설정을 확인해 주세요.',
  complained: '이메일 알림이 꺼져 있어요. 원하면 다시 활성화할 수 있습니다.',
  soft_failing: '최근 이메일이 도착하지 않았어요. 메일함 용량이나 수신함 정책을 확인해 주세요.',
}

export function EmailStatusBanner({ status }: { status: string }) {
  if (status === 'active' || !messages[status]) return null

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <span>{messages[status]}</span>
        <Link href="/me/notifications" className="shrink-0 underline underline-offset-2">
          설정 보기
        </Link>
      </div>
    </div>
  )
}
