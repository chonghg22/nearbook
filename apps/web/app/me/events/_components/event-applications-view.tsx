'use client'

import Link from 'next/link'

interface Item {
  id: number
  status: string
  queuePosition: number | null
  createdAt: string
  program: {
    id: number
    title: string
    startsAt: string
    libraryName: string
  }
}

interface Props {
  items: Item[]
}

function statusLabel(status: string, queuePosition: number | null) {
  if (status === 'queued') return queuePosition ? `접수됨, 대기 ${queuePosition}번째` : '접수됨'
  if (status === 'confirmed') return '참가 확정'
  if (status === 'waitlisted') return queuePosition ? `대기 ${queuePosition}번째` : '대기자'
  if (status === 'cancelled') return '취소됨'
  return status
}

export function EventApplicationsView({ items }: Props) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">내 문화행사 신청</h2>
        <span className="text-sm text-gray-500">{items.length}건</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          신청한 문화행사가 없습니다.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/events/${item.program.id}`}
                    className="font-medium hover:underline"
                  >
                    {item.program.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.program.libraryName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    행사일 {new Date(item.program.startsAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
                  {statusLabel(item.status, item.queuePosition)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
