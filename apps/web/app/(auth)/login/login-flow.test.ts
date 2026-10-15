// @vitest-environment jsdom
import { createElement as h } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import LoginPage from './page'
const mocked = vi.hoisted(() => ({
  oauth: vi.fn(),
  params: new URLSearchParams('next=/me/libraries'),
}))
vi.mock('next/navigation', () => ({ useSearchParams: () => mocked.params }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithOAuth: mocked.oauth } }),
}))
beforeEach(() => {
  mocked.oauth.mockReset()
  mocked.params = new URLSearchParams('next=/me/libraries')
})
afterEach(cleanup)
it('deduplicates login start, preserves the internal return route, and offers retry without logging secrets', async () => {
  let finish!: (value: unknown) => void
  mocked.oauth.mockImplementationOnce(
    () =>
      new Promise((done) => {
        finish = done
      })
  )
  render(h(LoginPage))
  const button = screen.getByRole('button', { name: /카카오로 시작하기/ })
  fireEvent.click(button)
  fireEvent.click(button)
  expect(mocked.oauth).toHaveBeenCalledOnce()
  const request = mocked.oauth.mock.calls[0]![0]
  expect(request.provider).toBe('kakao')
  expect(new URL(request.options.redirectTo).searchParams.get('next')).toBe('/me/libraries')
  await act(async () => {
    finish({ data: { url: null }, error: new Error('sensitive provider error') })
  })
  expect(screen.getByRole('alert').textContent).toContain('다시 시도')
  expect(screen.getByRole('alert').textContent).not.toContain('sensitive')
  expect((button as HTMLButtonElement).disabled).toBe(false)
})
it('unsafe incoming next is replaced by the same-origin main fallback even when OAuth fails', async () => {
  mocked.params = new URLSearchParams('next=https://evil.example/')
  mocked.oauth.mockRejectedValue(new Error('offline'))
  render(h(LoginPage))
  await act(async () => {
    fireEvent.click(screen.getByRole('button'))
  })
  expect(new URL(mocked.oauth.mock.calls[0]![0].options.redirectTo).searchParams.get('next')).toBe(
    '/'
  )
  expect(screen.getByRole('alert')).toBeTruthy()
})
it('the actual login route displays callback failure recovery without starting OAuth', () => {
  mocked.params = new URLSearchParams('error=auth&next=/me/wishlist')
  render(h(LoginPage))
  expect(screen.getByRole('alert').textContent).toContain('로그인이 완료되지 않았습니다')
  expect(mocked.oauth).not.toHaveBeenCalled()
})
