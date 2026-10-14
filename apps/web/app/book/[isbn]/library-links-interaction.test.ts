// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LibraryCard } from '@/components/library/library-card'
import { libraryDirectionsUrl } from '@/lib/library-links.mjs'

afterEach(cleanup)
describe('library CTA interactions', () => {
  it('exposes keyboard links, new-tab protection, touch targets and existing click actions', () => {
    const onClick = vi.fn()
    const directions = libraryDirectionsUrl(37.5665, 126.978, '서울도서관')
    render(
      createElement(LibraryCard, {
        libraryId: '111314',
        libraryName: '서울도서관',
        status: 'available',
        homepageUrl: 'https://lib.seoul.go.kr/',
        directionsUrl: directions,
        onClick,
      })
    )
    const official = screen.getByRole('link', { name: '공식 사이트에서 확인 — 서울도서관, 새 탭' })
    const route = screen.getByRole('link', { name: '서울도서관 길찾기 — 카카오맵, 새 탭' })
    for (const link of [official, route]) {
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
      expect(link.className).toContain('min-h-11')
      expect(link.tabIndex).toBe(0)
      link.focus()
      expect(document.activeElement).toBe(link)
      // Avoid real navigation while validating React click behavior.
      link.addEventListener('click', (event) => event.preventDefault())
      fireEvent.click(link)
    }
    expect(official.getAttribute('href')).toBe('https://lib.seoul.go.kr/')
    expect(route.getAttribute('href')).toBe(directions)
    expect(onClick.mock.calls).toEqual([['library_site'], ['directions']])
    expect(screen.queryByRole('button', { name: /예약/ })).toBeNull()
  })
})
