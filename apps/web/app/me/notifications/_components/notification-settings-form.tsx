'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api-client'

interface Props {
  emailOnAvailable: boolean
  email: string | null
  emailStatus: 'active' | 'bounced' | 'complained' | 'soft_failing'
  digestFrequency: 'daily' | 'weekly'
  softBounceCount: number
  lastBounceReason: string | null
}

const statusMessages = {
  bounced: '이메일 주소가 잘못됐거나 수신이 차단되어 알림을 자동으로 껐습니다.',
  complained: '스팸 신고가 감지되어 알림을 자동으로 껐습니다.',
  soft_failing: '최근 메일이 여러 번 지연 또는 반송되어 알림을 잠시 껐습니다.',
} as const

export function NotificationSettingsForm({
  emailOnAvailable: initialEnabled,
  email,
  emailStatus: initialStatus,
  digestFrequency: initialFrequency,
  softBounceCount: initialSoftBounceCount,
  lastBounceReason,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [status, setStatus] = useState(initialStatus)
  const [frequency, setFrequency] = useState(initialFrequency)
  const [softBounceCount, setSoftBounceCount] = useState(initialSoftBounceCount)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function updatePref(patch: { emailOnAvailable?: boolean; digestFrequency?: 'daily' | 'weekly' }) {
    setSaving(true)
    setMessage(null)

    const res = await apiFetch('/me/notification-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })

    if (res.ok) {
      const json = await res.json()
      const nextEnabled = Boolean(json.data?.emailOnAvailable ?? enabled)
      const nextFrequency = (json.data?.digestFrequency ?? frequency) as 'daily' | 'weekly'
      setEnabled(nextEnabled)
      setFrequency(nextFrequency)
      setStatus((json.data?.emailStatus ?? status) as typeof status)
      setSoftBounceCount(Number(json.data?.softBounceCount ?? softBounceCount))
      setMessage('알림 설정을 저장했습니다.')
    } else {
      setMessage('설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }

    setSaving(false)
  }

  async function reactivate() {
    setSaving(true)
    setMessage(null)

    const res = await apiFetch('/me/notification-preferences/reactivate', {
      method: 'POST',
    })

    if (res.ok) {
      setEnabled(true)
      setStatus('active')
      setSoftBounceCount(0)
      setMessage('이메일 알림을 다시 켰습니다.')
    } else {
      setMessage('재활성화하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }

    setSaving(false)
  }

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">알림 설정</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            위시한 책이 내 기본 도서관에서 대출 가능해지면 매일 새벽 한 번, 묶음 메일로 알려드립니다.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            수신 주소: {email ?? '이메일 없음'}
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => updatePref({ emailOnAvailable: !enabled })}
          className={`inline-flex min-w-28 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
            enabled
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {saving ? '저장 중...' : enabled ? '알림 켜짐' : '알림 꺼짐'}
        </button>
      </div>

      {status !== 'active' && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">이메일 상태: {status}</p>
          <p className="mt-1">{statusMessages[status as keyof typeof statusMessages]}</p>
          {lastBounceReason && <p className="mt-1 text-xs text-amber-800">사유: {lastBounceReason}</p>}
          {softBounceCount > 0 && <p className="mt-1 text-xs text-amber-800">누적 soft bounce: {softBounceCount}회</p>}
          <button
            type="button"
            disabled={saving}
            onClick={reactivate}
            className="mt-3 inline-flex rounded-full bg-amber-900 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
          >
            다시 활성화
          </button>
        </div>
      )}

      <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
        <p>대상: 위시리스트에 담긴 책</p>
        <p>기준 도서관: 기본 도서관 우선, 없으면 등록 도서관 또는 같은 지역 도서관 fallback</p>
        <p>중복 방지: 같은 책·도서관 조합은 7일 내 재발송하지 않습니다.</p>
      </div>

      {enabled && (
        <div className="mt-6 rounded-xl border p-4">
          <p className="text-sm font-semibold text-gray-900">받는 주기</p>
          <div className="mt-3 space-y-3 text-sm">
            <label className="flex items-start gap-3">
              <input
                type="radio"
                name="digestFrequency"
                checked={frequency === 'daily'}
                onChange={() => updatePref({ digestFrequency: 'daily' })}
              />
              <span>
                <strong>매일 아침</strong>
                <br />
                <span className="text-xs text-gray-500">새벽 4시에 그날 도착한 책을 바로 알려드려요.</span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="radio"
                name="digestFrequency"
                checked={frequency === 'weekly'}
                onChange={() => updatePref({ digestFrequency: 'weekly' })}
              />
              <span>
                <strong>주 1회 월요일 아침</strong>
                <br />
                <span className="text-xs text-gray-500">지난 한 주 동안 들어온 책을 모아서 보내드려요.</span>
              </span>
            </label>
          </div>
        </div>
      )}

      {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
    </section>
  )
}
