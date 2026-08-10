import { notFound } from 'next/navigation'
import { CalendarDays, Library, MapPin, Users } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { EventApplicationPanel } from './_components/event-application-panel'

const API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'

export const metadata = {
  title: '문화행사 상세 | 우리동네책',
}

async function getProgram(id: string) {
  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const requestInit: RequestInit = {
    cache: 'no-store',
    ...(session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {}),
  }

  const res = await fetch(`${API_URL}/event-programs/${id}`, requestInit)

  if (res.status === 404) notFound()
  if (!res.ok) return null
  const json = await res.json()
  return json.data
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function stateLabel(state: string) {
  if (state === 'open') return '신청 가능'
  if (state === 'scheduled') return '신청 예정'
  return '신청 마감'
}

// Next.js 15의 App Router는 params를 Promise로 전달한다.
export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const program = await getProgram(id)
  if (!program) notFound()

  return (
    <main className="min-h-screen bg-canvas">
      <section className="page-padding section-gap">
        <div className="mb-6">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {stateLabel(program.applicationState)}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{program.title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {program.summary}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-white p-5">
              <h2 className="text-base font-semibold">행사 정보</h2>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Library size={16} />
                  {program.library.name}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin size={16} />
                  {program.library.address}
                </span>
                <span className="flex items-center gap-2">
                  <CalendarDays size={16} />
                  {formatDateTime(program.startsAt)} 시작
                </span>
                <span className="flex items-center gap-2">
                  <Users size={16} />
                  정원 {program.capacity}명, 확정 {program.confirmedCount}명
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-white p-5">
              <h2 className="text-base font-semibold">소개</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {program.description}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-white p-5">
              <h2 className="text-base font-semibold">큐 처리 현황</h2>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md bg-secondary p-3">
                  <p className="text-lg font-bold">{program.queue.queued}</p>
                  <p className="mt-1 text-xs text-muted-foreground">처리 대기</p>
                </div>
                <div className="rounded-md bg-secondary p-3">
                  <p className="text-lg font-bold">{program.queue.confirmed}</p>
                  <p className="mt-1 text-xs text-muted-foreground">확정</p>
                </div>
                <div className="rounded-md bg-secondary p-3">
                  <p className="text-lg font-bold">{program.queue.waitlisted}</p>
                  <p className="mt-1 text-xs text-muted-foreground">대기자</p>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <EventApplicationPanel
              programId={program.id}
              applicationState={program.applicationState}
              initialApplication={program.myApplication}
            />
            <div className="rounded-lg border border-dashed border-border bg-white p-4 text-xs leading-6 text-muted-foreground">
              포트폴리오 포인트: 신청 API는 정원 확정을 직접 처리하지 않고 큐에 접수합니다.
              확정 처리는 worker가 제한된 배치로 처리해 DB 부하를 제어합니다.
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
