// @vitest-environment jsdom
import { createElement as h } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import LoginPage from './page'
const mocked = vi.hoisted(() => ({
  params: new URLSearchParams('next=/me/libraries'),
}))
vi.mock('next/navigation', () => ({ useSearchParams: () => mocked.params }))
const original = window.location
let location: { href: string }
beforeEach(() => {
  mocked.params = new URLSearchParams('next=/me/libraries')
  location = { href: 'https://near.example/login' }
  Object.defineProperty(window, 'location', { configurable: true, value: location })
})
afterEach(() => {
  cleanup()
  Object.defineProperty(window, 'location', { configurable: true, value: original })
})
it('deduplicates login start and hands the internal return route to the server login route', () => {
  render(h(LoginPage))
  const button = screen.getByRole('button', { name: /카카오로 시작하기/ })
  fireEvent.click(button)
  const first = location.href
  location.href = 'unchanged'
  fireEvent.click(button)
  expect(first).toBe('/auth/kakao?next=%2Fme%2Flibraries')
  expect(location.href).toBe('unchanged')
  expect((button as HTMLButtonElement).disabled).toBe(true)
})
it('unsafe incoming next is replaced by the same-origin main fallback', () => {
  mocked.params = new URLSearchParams('next=https://evil.example/')
  render(h(LoginPage))
  fireEvent.click(screen.getByRole('button'))
  expect(location.href).toBe('/auth/kakao?next=%2F')
})
it('the actual login route displays callback failure recovery without starting OAuth', () => {
  mocked.params = new URLSearchParams('error=auth&next=/me/wishlist')
  render(h(LoginPage))
  expect(screen.getByRole('alert').textContent).toContain('로그인이 완료되지 않았습니다')
  expect(location.href).toBe('https://near.example/login')
})
