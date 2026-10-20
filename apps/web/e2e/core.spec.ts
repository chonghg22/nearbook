import { test, expect, type BrowserContext } from '@playwright/test'

const isbn = '9791161571195'
const title = '회귀 검증을 위한 책'
const fixture = 'http://127.0.0.1:4101'
const base = 'http://127.0.0.1:3100'
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
async function signIn(context: BrowserContext, id: string) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, exp, aud: 'authenticated', role: 'authenticated' })}.isolated-fixture-signature`
  const session = { access_token: token, refresh_token: 'isolated-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp,
    user: { id, aud: 'authenticated', role: 'authenticated', email: `${id}@example.test`, app_metadata: {}, user_metadata: {} } }
  await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: base, sameSite: 'Lax' }])
}

test.beforeEach(async ({ request, context }) => {
  await request.post(`${fixture}/__reset`, { data: {} })
  // Only loopback app/fixture traffic is allowed, including popups and workers.
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' && ['3100', '4101'].includes(url.port)) await route.continue()
    else await route.abort('blockedbyclient')
  })
})

test('search → book → holding library → official link', async ({ page, request }) => {
  const source = 'qa-p115-local-fixture'
  await page.goto(`/search?source=${source}&token=fixture-sensitive&lat=37`)
  const input = page.getByRole('textbox', { name: '검색어', exact: true })
  await input.fill(title)
  await input.press('Enter')
  await expect(page.getByText('검색결과 1건')).toBeVisible()
  await page.getByRole('link', { name: new RegExp(title) }).first().click()
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await expect(page.getByText('대출 가능 1곳', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: /공식 사이트에서 확인/ })).toHaveAttribute('href', 'https://library.example.test/')
  // Verify the real browser → Next proxy → local collector path, without visiting the external site.
  const popup = page.waitForEvent('popup')
  await page.getByRole('link', { name: /공식 사이트에서 확인/ }).click()
  await (await popup).close()
  await expect.poll(async () => (await (await request.get(`${fixture}/__state`)).json()).events
    .some((event: { type: string }) => event.type === 'library_click')).toBe(true)
  const { events } = await (await request.get(`${fixture}/__state`)).json()
  const event = (type: string) => events.find((entry: { type: string }) => entry.type === type)
  expect(events.filter((entry: { type: string }) => entry.type === 'visit')).toHaveLength(1)
  expect(event('search_submit').payload).toMatchObject({ query: title })
  expect(event('book_result_click').payload).toMatchObject({ query: title, isbn, rank: 1 })
  expect(event('book_detail_view').payload).toMatchObject({ isbn })
  expect(event('holdings_request_completed').payload).toMatchObject({ isbn, checkedCount: 1, outcome: 'complete' })
  expect(event('library_click').payload).toMatchObject({ isbn, libraryId: '111314', action: 'library_site',
    requestId: event('holdings_request_completed').payload.requestId })
  for (const entry of events) {
    expect(entry.sessionId).toBe(event('visit').sessionId)
    expect(entry.payload).toMatchObject({ schemaVersion: 2, trafficSource: source, anonymousId: event('visit').payload.anonymousId })
    expect(entry.search).not.toMatch(/token=|lat=|fixture-sensitive/)
  }
  await page.getByRole('link', { name: '검증 도서관', exact: true }).click()
  await expect(page.getByRole('heading', { name: '검증 도서관', exact: true })).toBeVisible()
  await expect(page.getByText('평일 09:00~18:00')).toBeVisible()
})

test('regional directory exposes eligible content and opens a library detail', async ({ page }) => {
  await page.goto('/regions')
  await expect(page.getByRole('heading', { name: '지역별 공공도서관', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /부산광역시/ })).toHaveCount(0)
  await page.getByRole('link', { name: /서울특별시.*공공도서관 3곳/ }).click()
  await expect(page.getByRole('heading', { name: '서울특별시 공공도서관', exact: true })).toBeVisible()
  await expect(page.locator('a[href^="/library/"]')).toHaveCount(3)
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('link', { name: /검증 도서관 서울시/ }).click()
  await expect(page.getByRole('heading', { name: '검증 도서관', exact: true })).toBeVisible()
  await page.goto('/region/busan')
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/)
  await expect(page.getByRole('heading', { name: '부산광역시 공공도서관', exact: true })).toHaveCount(0)
})

test('private entry emits no page view and public navigation starts one visit', async ({ page, context, request }) => {
  await signIn(context, 'reader-b')
  await page.goto('/me/wishlist?token=fixture-private')
  await expect(page.getByText(/위시리스트.*비어|아직.*찜|찜한 책이/).first()).toBeVisible()
  await page.getByRole('link', { name: '책 검색하러 가기', exact: true }).click()
  await expect.poll(async () => (await (await request.get(`${fixture}/__state`)).json()).events
    .some((entry: { type: string }) => entry.type === 'visit')).toBe(true)
  const { events } = await (await request.get(`${fixture}/__state`)).json()
  expect(events.filter((entry: { type: string }) => entry.type === 'visit')).toHaveLength(1)
  expect(events.every((entry: { pathname: string }) => !entry.pathname.startsWith('/me/'))).toBe(true)
  expect(JSON.stringify(events)).not.toContain('fixture-private')
})

for (const status of [429, 503]) {
  test(`holdings HTTP ${status} is an error and retry recovers`, async ({ page }) => {
    await page.route(`**/api/books/${isbn}/holdings?*`, (route) => route.fulfill({ status, json: { error: 'fixture' } }))
    await page.goto(`/book/${isbn}`)
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: '책이 없다는 뜻은 아닙니다' })).toBeVisible()
    await page.unroute(`**/api/books/${isbn}/holdings?*`)
    await page.getByRole('button', { name: '다시 시도', exact: true }).click()
    await expect(page.getByText('대출 가능 1곳', { exact: false })).toBeVisible()
  })
}

test('search failure stays distinct from zero results and recovers', async ({ page, request }) => {
  await request.post(`${fixture}/__reset`, { data: { searchStatus: 503 } })
  await page.goto(`/search?q=${encodeURIComponent(title)}`)
  await expect(page.getByText('검색 결과를 불러오지 못했습니다', { exact: false }).first()).toBeVisible()
  await expect(page.getByText('검색결과 0건', { exact: false })).toHaveCount(0)
  await request.post(`${fixture}/__reset`, { data: {} })
  await page.getByRole('button', { name: '다시 시도', exact: true }).click()
  await expect(page.getByText('검색결과 1건', { exact: false })).toBeVisible()
})

test('a stalled holding request reaches its deadline and can retry', async ({ page }) => {
  const pattern = `**/api/books/${isbn}/holdings?*`
  await page.route(pattern, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 17000))
    await route.abort('timedout').catch(() => {})
  })
  await page.goto(`/book/${isbn}`)
  await expect(page.getByRole('status').filter({ hasText: '주변 도서관 보유 현황을 확인하고 있습니다.' })).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: '책이 없다는 뜻은 아닙니다' })).toBeVisible({ timeout: 22000 })
  await page.unroute(pattern)
  await page.getByRole('button', { name: '다시 시도', exact: true }).click()
  await expect(page.getByText('대출 가능 1곳', { exact: false })).toBeVisible()
})

test('GPS denial provides manual region choice and returns focus', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, fail) => fail?.({ code: 1, message: 'denied', PERMISSION_DENIED: 1 } as GeolocationPositionError)
  })
  await page.goto(`/book/${isbn}`)
  const trigger = page.getByRole('button', { name: '지역·도서관 변경' })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: '현재 위치', exact: true }).click()
  await dialog.getByRole('button', { name: '내 위치로 검색' }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await dialog.getByRole('button', { name: 'GPS 없이 지역 직접 선택' }).click()
  await dialog.getByRole('button', { name: '부산광역시', exact: true }).click()
  await dialog.getByRole('button', { name: '부산 중심', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await expect(page.getByText('부산광역시', { exact: true })).toBeVisible()
})

test('anonymous wishlist returns to the requested book and OAuth failure can retry', async ({ page }) => {
  await page.goto(`/book/${isbn}`)
  await page.getByRole('link', { name: '로그인하고 찜하기' }).click()
  await expect(page).toHaveURL(new RegExp(`next=.*book`))
  const login = page.getByRole('button', { name: /카카오로 시작하기/ })
  await login.click()
  // Local HTTP fixture is deliberately rejected as an OAuth HTTPS destination.
  await expect(page.getByRole('alert').filter({ hasText: '로그인을 시작하지 못했습니다' })).toBeVisible()
  await expect(login).toBeEnabled()
})

test('authenticated save failure requires state recheck and duplicate clicks save once', async ({ page, context, request }) => {
  await signIn(context, 'reader-a')
  await request.post(`${fixture}/__reset`, { data: { saveFailure: true } })
  await page.goto(`/book/${isbn}`)
  await page.getByRole('button', { name: '위시리스트에 추가', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: '변경 전 상태를 다시 확인' })).toBeVisible()
  await request.post(`${fixture}/__reset`, { data: {} })
  await page.getByRole('button', { name: '찜 상태 다시 확인' }).click()
  const add = page.getByRole('button', { name: '위시리스트에 추가', exact: true })
  await expect(add).toBeEnabled()
  await add.evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
  await expect(page.getByRole('button', { name: '위시리스트에서 제거' })).toBeVisible()
  expect((await (await request.get(`${fixture}/__state`)).json()).writes).toBe(1)
})

test.describe('real worker privacy', () => {
test.use({ serviceWorkers: 'allow' })
test('account switch and offline reload cannot show the previous private list', async ({ page, context, request }) => {
  await request.post(`${fixture}/__reset`, { data: { added: { 'reader-a': true } } })
  await signIn(context, 'reader-a')
  await page.goto('/me/wishlist')
  await expect(page.getByText('독자 reader-a의 비공개 책')).toBeVisible()
  // Confirm the real worker controls a loaded A document before switching accounts.
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await expect(page.getByText('독자 reader-a의 비공개 책')).toBeVisible()
  const cachedPrivatePaths = await page.evaluate(async () => {
    const keys = await caches.keys()
    const requests = (await Promise.all(keys.map(async (key) => (await caches.open(key)).keys()))).flat()
    return requests.map((request) => new URL(request.url).pathname).filter((path) => path.startsWith('/me/') || path.startsWith('/api/me/'))
  })
  expect(cachedPrivatePaths).toEqual([])
  await signIn(context, 'reader-b')
  await page.reload()
  await expect(page.getByText('독자 reader-a의 비공개 책')).toHaveCount(0)
  await expect(page.getByText(/위시리스트.*비어|아직.*찜|찜한 책이/).first()).toBeVisible()
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  await expect(page.getByText('독자 reader-a의 비공개 책')).toHaveCount(0)
  await context.setOffline(false)
})
})

test('camera denial has a usable search fallback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => { throw new DOMException('카메라 권한 거부', 'NotAllowedError') } })
  })
  await page.goto('/scan')
  await expect(page.getByRole('heading', { name: '스캔 불가' })).toBeVisible()
  await page.getByRole('link', { name: '검색으로 입력하기' }).click()
  await expect(page).toHaveURL(/\/search/)
})

test('native ISBN detection navigates to the exact book', async ({ page }) => {
  await page.addInitScript((value) => {
    Object.defineProperty(window, 'BarcodeDetector', { value: class {
      static async getSupportedFormats() { return ['ean_13'] }
      async detect() { return [{ rawValue: value }] }
    } })
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => new MediaStream() })
    HTMLMediaElement.prototype.play = async () => {}
  }, isbn)
  await page.goto('/scan')
  await expect(page).toHaveURL(new RegExp(`/book/${isbn}\\?source=scan`))
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
})

for (const width of [360, 390, 430]) {
  test(`search and location dialog fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto(`/book/${isbn}`)
    await page.getByRole('button', { name: '지역·도서관 변경' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const bounds = await dialog.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await page.goto(`/search?q=${encodeURIComponent(title)}`)
    await expect(page.getByText('검색결과 1건', { exact: false })).toBeVisible()
    await expect(page.getByRole('textbox', { name: '검색어', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
