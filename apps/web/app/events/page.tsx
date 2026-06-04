import Link from 'next/link'
import { CalendarDays, Library, Users } from 'lucide-react'

const API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'

export const metadata = {
  title: '문화행사 | 우리동네책',
  description: '도서관 문화행사 신청과 대기열 기반 접수 데모',
}

async function getPrograms() {
  try {
    const res = await fetch(`${API_URL}/event-programs?pageSize=20`, { cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function applicationStateLabel(state: string) {
  if (state === 'open') return '신청 가능'
  if (state === 'scheduled') return '신청 예정'
  return '신청 마감'
}

export default async function EventsPage() {
  const programs = await getPrograms()

  return (
    <main className="min-h-screen bg-canvas">
      <section className="page-padding section-gap">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">도서관 문화행사</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">이벤트 참가 신청</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            신청이 한꺼번에 몰려도 접수와 확정 처리를 분리하는 큐 기반 데모입니다.
          </p>
        </div>

        {programs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
            현재 공개된 문화행사가 없습니다.
          </div>
        ) : (
          <ul className="space-y-4">
            {programs.map((program: any) => (
              <li key={program.id} className="card-interactive">
                <Link href={`/events/${program.id}`} className="block p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                          {applicationStateLabel(program.applicationState)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          확정 {program.confirmedCount} / {program.capacity}명
                        </span>
                      </div>
                      <h2 className="mt-3 text-lg font-semibold text-foreground">
                        {program.title}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {program.summary}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                    <span className="flex items-center gap-2">
                      <Library size={16} />
                      {program.library.name}
                    </span>
                    <span className="flex items-center gap-2">
                      <CalendarDays size={16} />
                      {formatDate(program.startsAt)}
                    </span>
                    <span className="flex items-center gap-2">
                      <Users size={16} />
                      대기열 접수 지원
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
