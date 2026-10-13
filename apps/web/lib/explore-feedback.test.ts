import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ExploreFeedback, CurationNote } from '@/app/explore/_components/explore-feedback'

describe('explore state rendering', () => {
  it('an error is an alert with a full document retry preserving the selected library', () => {
    const html = renderToStaticMarkup(React.createElement(ExploreFeedback, {
      status: 'error', emptyMessage: '정상 빈 결과', retryHref: '/new-books?libraryId=126024',
    }))
    expect(html).toContain('role="alert"')
    expect(html).toContain('href="/new-books?libraryId=126024"')
    expect(html).not.toContain('정상 빈 결과')
    expect(html).not.toContain('준비')
  })
  it('a successful empty state is not an outage', () => {
    const html = renderToStaticMarkup(React.createElement(ExploreFeedback, { status: 'empty', emptyMessage: '저장된 목록이 없습니다', retryHref: '/popular' }))
    expect(html).toContain('role="status"')
    expect(html).toContain('저장된 목록이 없습니다')
    expect(html).not.toContain('불러오지 못했습니다')
  })
  it('ready lists do not show an error or empty notice', () => {
    expect(renderToStaticMarkup(React.createElement(ExploreFeedback, { status: 'ready', emptyMessage: 'empty', retryHref: '/popular' }))).toBe('')
  })
  it('stale snapshots state their stored period without claiming an active update', () => {
    const html = renderToStaticMarkup(React.createElement(CurationNote, { items: [{ curationPeriod: '2000-07' }], source: '정보나루' }))
    expect(html).toContain('2000-07')
    expect(html).toContain('이전 시점')
    expect(html).not.toContain('갱신 중')
    expect(html).not.toContain('매일 갱신')
  })
})
