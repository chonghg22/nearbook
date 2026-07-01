'use client'

import { useState } from 'react'
import { PUBLIC_API_BASE_URL } from '@/lib/constants'

const API_URL = PUBLIC_API_BASE_URL

type Category = 'bug' | 'suggestion' | 'other'

const CATEGORY_OPTIONS: { value: Category; label: string; description: string }[] = [
  { value: 'bug', label: '오류 신고', description: '동작이 이상하거나 데이터가 잘못된 경우' },
  { value: 'suggestion', label: '개선 제안', description: '이런 기능이 있으면 좋겠어요' },
  { value: 'other', label: '기타 문의', description: '서비스 이용 관련 질문' },
]

export default function FeedbackPage() {
  const [category, setCategory] = useState<Category>('bug')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (title.trim().length < 2) return setError('제목을 2자 이상 입력해주세요.')
    if (body.trim().length < 5) return setError('내용을 5자 이상 입력해주세요.')

    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          title: title.trim(),
          body: body.trim(),
          contactEmail: contactEmail.trim() || undefined,
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        }),
      })
      if (!res.ok) {
        if (res.status === 429) throw new Error('너무 자주 제출하셨어요. 잠시 후 다시 시도해주세요.')
        throw new Error('제출에 실패했어요. 잠시 후 다시 시도해주세요.')
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <article className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-xl font-bold">소중한 의견 감사합니다!</h1>
        <p className="mt-2 text-gray-600">검토 후 필요한 경우 입력하신 이메일로 답변드릴게요.</p>
        <button
          onClick={() => {
            setDone(false)
            setTitle('')
            setBody('')
            setContactEmail('')
          }}
          className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-700"
        >
          하나 더 보내기
        </button>
      </article>
    )
  }

  return (
    <article className="max-w-2xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">오류 신고 · 개선 제안</h1>
        <p className="mt-2 text-gray-600">
          서비스를 더 좋게 만들 수 있도록 의견을 보내주세요. 1인이 운영하는 서비스라 모든 의견을 직접 확인합니다.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset>
          <legend className="text-sm font-medium mb-2">유형</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {CATEGORY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-lg border p-3 text-sm ${
                  category === opt.value ? 'border-primary bg-primary-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={opt.value}
                  checked={category === opt.value}
                  onChange={() => setCategory(opt.value)}
                  className="sr-only"
                />
                <div className="font-medium">{opt.label}</div>
                <div className="mt-1 text-xs text-gray-500">{opt.description}</div>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={256}
            required
            placeholder="간단한 한 줄 설명"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="body" className="block text-sm font-medium mb-1">
            내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            required
            rows={8}
            placeholder={
              category === 'bug'
                ? '어떤 페이지에서, 어떤 동작을 했을 때, 무엇이 잘못되었는지 알려주세요.'
                : '어떤 기능이 어떻게 개선되면 좋을지 자유롭게 적어주세요.'
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">{body.length} / 4000</p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            답변 받을 이메일 <span className="text-gray-400">(선택)</span>
          </label>
          <input
            id="email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            maxLength={256}
            placeholder="reply@example.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">필요한 경우에만 답변에 사용하고 마케팅에는 쓰지 않습니다.</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-primary py-2.5 text-white font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {submitting ? '제출 중…' : '의견 보내기'}
        </button>
      </form>
    </article>
  )
}
