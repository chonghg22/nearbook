import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page, request }) => {
  await request.post('http://127.0.0.1:4101/__reset')
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' && ['3100', '4101'].includes(url.port)) await route.continue()
    else await route.abort('blockedbyclient')
  })
})

test('home → guide → search → holdings preserves guide attribution', async ({ page, request }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /국립중앙도서관 책 검색 방법과 가까운 도서관/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('국립중앙도서관 책 검색 방법')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByLabel('책 제목 또는 ISBN').fill('회귀 검증을 위한 책')
  await page.getByLabel('책 제목 또는 ISBN').press('Enter')
  await expect(page).toHaveURL(/\/search\?source=guide-national-library-search&q=/)
  await page.getByRole('link', { name: /회귀 검증을 위한 책/ }).first().click()
  await expect(page.getByRole('link', { name: /공식 사이트에서 확인/ })).toHaveAttribute('href', 'https://library.example.test/')
  await expect.poll(async () => (await (await request.get('http://127.0.0.1:4101/__state')).json()).events
    .some((event: { type: string; payload: { trafficSource?: string } }) => event.type === 'book_detail_view' && event.payload.trafficSource === 'guide-national-library-search')).toBe(true)
})

test('digital guide explains access restrictions and links to official usage help', async ({ page }) => {
  await page.goto('/guides')
  await page.getByRole('link', { name: /국가전자도서관 이용 방법/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('국가전자도서관')
  await expect(page.getByText('집에서 무료로 내려받을 수 있는 것은 아닙니다.', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: '국가전자도서관 공식 이용방법', exact: true })).toHaveAttribute('href', 'https://dlibrary.go.kr/intro/help.do')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.near-book.com/guides/national-digital-library')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `test-results/digital-guide-${test.info().project.name}.png`, fullPage: true })
})
