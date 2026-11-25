// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BookRequest } from './request-form'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@/lib/api-client', () => ({ personalApiFetch: request }))
vi.mock('next/link', () => ({ default: ({ href, children, prefetch: _prefetch, ...rest }: any) => <a href={href} {...rest}>{children}</a> }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('explicit book acquisition', () => {
  it('does not fetch on view and requires a button press before sending an authenticated POST', async () => {
    request.mockResolvedValue(new Response('{}', { status: 401 }))
    render(<BookRequest isbn="9791161571195" />)
    expect(request).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '도서 정보 가져오기' }))
    await screen.findByText('도서 정보를 새로 가져오려면 로그인해 주세요.')
    expect(request).toHaveBeenCalledWith('/books/9791161571195/acquire', { method: 'POST', timeoutMs: 35000 })
    expect(screen.getByText('로그인하고 계속하기').getAttribute('href')).toContain('/login?next=')
  })
  it.each([
    [404, '도서 정보 제공처에서 이 책을 찾지 못했습니다. ISBN을 확인해 주세요.'],
    [429, '요청이 많습니다. 잠시 후 다시 시도해 주세요.'],
    [503, '지금은 도서 정보를 가져오기 어렵습니다. 잠시 후 다시 시도해 주세요.'],
  ])('distinguishes absence, throttling and temporary failure (%i)', async (status, message) => {
    request.mockResolvedValue(new Response('{}', { status }))
    render(<BookRequest isbn="9791161571195" />)
    fireEvent.click(screen.getByRole('button'))
    await screen.findByText(message)
    await waitFor(() => expect(screen.getByRole('button').hasAttribute('disabled')).toBe(false))
  })
  it('does not send invalid ISBN paths', () => {
    render(<BookRequest isbn="../../" />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(request).not.toHaveBeenCalled()
  })
})
