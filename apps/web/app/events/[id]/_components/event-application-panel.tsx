'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'

interface Application {
  id: number
  status: string
  queuePosition: number | null
}

interface Props {
  programId: number
  applicationState: string
  initialApplication: Application | null
}

function statusText(status: string, position?: number | null) {
  if (status === 'queued') return position ? `접수됨, 대기 ${position}번째` : '접수됨, 처리 대기 중'
  if (status === 'confirmed') return '참가 확정'
  if (status === 'waitlisted') return position ? `정원 초과, 대기 ${position}번째` : '정원 초과 대기'
  if (status === 'cancelled') return '신청 취소됨'
  return '신청 상태 확인 중'
}

export function EventApplicationPanel({
  programId,
  applicationState,
  initialApplication,
}: Props) {
  const [application, setApplication] = useState<Application | null>(initialApplication)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  async function handleApply() {
    setLoading(true)
    setMessage('접속량이 많을 수 있어 순서를 확인하는 중입니다.')
    try {
      const res = await apiFetch(`/event-programs/${programId}/applications`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })

      if (res.status === 401) {
        router.push(`/login?next=/events/${programId}`)
        return
      }

      const json = await res.json().catch(() => null)
      if (res.status === 429) {
        setMessage('현재 신청이 몰리고 있습니다. 잠시 후 다시 시도해 주세요.')
        return
      }
      if (!res.ok) {
        setMessage(json?.message ?? '신청할 수 없습니다.')
        return
      }

      setApplication({
        id: json.data.applicationId,
        status: json.data.status,
        queuePosition: json.data.position,
      })
      const waitedMs = Number(json.meta?.admission?.waitedMs ?? 0)
      setMessage(
        waitedMs > 0
          ? `순서 대기 ${waitedMs}ms 후 신청이 큐에 접수되었습니다.`
          : '신청이 큐에 접수되었습니다. 확정 처리는 순차적으로 진행됩니다.'
      )
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await apiFetch(`/event-programs/${programId}/applications/me`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setApplication({ id: application?.id ?? 0, status: 'cancelled', queuePosition: null })
        setMessage('신청을 취소했습니다.')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const disabled = loading || applicationState !== 'open'
  const activeApplication = application && application.status !== 'cancelled'

  return (
    <div className="rounded-lg border border-border bg-white p-5">
      <h2 className="text-base font-semibold">참가 신청</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        신청 요청은 즉시 큐에 접수되고, worker가 정원만큼 순서대로 확정합니다.
      </p>

      {application && (
        <div className="mt-4 rounded-md bg-secondary px-3 py-2 text-sm font-medium">
          {statusText(application.status, application.queuePosition)}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={handleApply}
          disabled={disabled || Boolean(activeApplication)}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
          {activeApplication ? '신청 완료' : applicationState === 'open' ? '신청하기' : '신청 불가'}
        </button>
        {activeApplication && (
          <button
            onClick={handleCancel}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            신청 취소
          </button>
        )}
      </div>

      {message && (
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  )
}
