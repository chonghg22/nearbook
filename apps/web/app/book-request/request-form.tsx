'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { personalApiFetch } from '@/lib/api-client'

export function BookRequest({ isbn }: { isbn: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [login, setLogin] = useState(false)
  const submitting = useRef(false)
  if (!/^(?:97[89]\d{10}|\d{9}[\dXx])$/.test(isbn)) return <p className="mt-6">책을 다시 검색한 후 시도해 주세요.</p>
  async function acquire() {
    if (submitting.current) return
    submitting.current = true
    setBusy(true); setMessage(''); setLogin(false)
    try {
      const response = await personalApiFetch(`/books/${isbn}/acquire`, { method: 'POST', timeoutMs: 35000 })
      if (response.ok) { window.location.assign(`/book/${isbn}`); return }
      if (response.status === 401) {
        setLogin(true); setMessage('도서 정보를 새로 가져오려면 로그인해 주세요.')
      } else if (response.status === 404) {
        setMessage('도서 정보 제공처에서 이 책을 찾지 못했습니다. ISBN을 확인해 주세요.')
      } else if (response.status === 429) {
        setMessage('요청이 많습니다. 잠시 후 다시 시도해 주세요.')
      } else {
        setMessage('지금은 도서 정보를 가져오기 어렵습니다. 잠시 후 다시 시도해 주세요.')
      }
    } catch { setMessage('연결을 확인하고 잠시 후 다시 시도해 주세요.') }
    finally { submitting.current = false; setBusy(false) }
  }
  return <section className="mt-6 space-y-4">
    <p className="text-sm text-gray-600">ISBN {isbn}</p>
    <button type="button" disabled={busy} onClick={acquire} className="rounded-xl bg-primary px-5 py-3 text-white disabled:opacity-50">
      {busy ? '도서 정보 확인 중…' : '도서 정보 가져오기'}
    </button>
    {message && <p role="status">{message}</p>}
    {login && <Link prefetch={false} className="block underline" href={`/login?next=${encodeURIComponent(`/book-request?isbn=${isbn}`)}`}>로그인하고 계속하기</Link>}
    <Link className="block underline" href="/search">다른 책 찾기</Link>
  </section>
}
