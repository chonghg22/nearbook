import { test, expect } from '@playwright/test'

const fixture = 'http://127.0.0.1:4101'
const path = '/book/9791161571195'

for (const apiStatus of [200, 409, 503]) {
  test(`metadata API ${apiStatus} preserves the public document response`, async ({ request }) => {
    await request.post(`${fixture}/__reset`, { data: { bookStatus: apiStatus } })
    const response = await request.get(path)
    expect(response.status()).toBe(apiStatus === 409 ? 503 : apiStatus)
    const html = await response.text()
    if (apiStatus === 409 || apiStatus === 503) {
      expect(response.headers()['retry-after']).toBe('3600')
      expect(response.headers()['cache-control']).toBe('no-store')
      if (apiStatus === 409) {
        expect(html).toContain('도서 정보가 아직 준비되지 않았습니다')
        expect(html).toContain('/book-request?isbn=9791161571195')
      } else {
        expect(html).toContain('도서 정보를 잠시 불러올 수 없습니다')
      }
      // Middleware stops the render before metadata/page can turn the conflict into a 500.
      const state = await (await request.get(`${fixture}/__state`)).json()
      expect(state.bookReads).toBe(1)
    } else {
      expect(response.headers()['retry-after']).toBeUndefined()
      if (apiStatus === 200) {
        expect(html).toContain('<h1')
        expect(html).toContain('회귀 검증을 위한 책')
        expect(html).toMatch(/<title>[^<]*회귀 검증을 위한 책/)
      }
    }
  })
}

test('genuine absence keeps the existing not-found content and noindex policy', async ({ request }) => {
  await request.post(`${fixture}/__reset`, { data: { bookStatus: 404 } })
  const response = await request.get(path)
  const html = await response.text()
  // Next can stream a 200 before notFound() resolves; this compatibility patch does not fix it.
  expect([200, 404]).toContain(response.status())
  expect(response.headers()['retry-after']).toBeUndefined()
  expect(html).toContain('책을 찾을 수 없습니다')
  expect(html).toMatch(/<meta name="robots" content="noindex[^\"]*"/)
  expect(html).not.toContain('도서 정보를 잠시 불러올 수 없습니다')
  console.info(JSON.stringify({ case: 'genuine-absence', source: process.env.NEARBOOK_BASELINE_SOURCE ?? 'compat',
    publicStatus: response.status(), upstreamStatus: 404, notFoundContent: true, noindex: true }))
})

for (const apiStatus of [409, 503]) {
test(`HEAD preserves the API ${apiStatus} temporary response without rendering the page`, async ({ request }) => {
  await request.post(`${fixture}/__reset`, { data: { bookStatus: apiStatus } })
  const response = await request.head(path)
  expect(response.status()).toBe(503)
  expect(response.headers()['retry-after']).toBe('3600')
  expect(response.headers()['cache-control']).toBe('no-store')
  expect(await response.text()).toBe('')
  expect((await (await request.get(`${fixture}/__state`)).json()).bookReads).toBe(1)
})
}
