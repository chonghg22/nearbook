// Anonymous browser smoke test in an isolated profile. No production login,
// account changes, fixture cache injection, or server mutations.
import { pathToFileURL } from 'node:url'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const { chromium } = await import(pathToFileURL(process.env.PWA_PLAYWRIGHT_MODULE))
const base = new URL(process.env.PWA_REMOTE_URL).origin
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await context.newPage()
const evidence = process.env.PWA_EVIDENCE_DIR
try {
  await page.goto(`${base}/offline`, { timeout: 60000 })
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  assert.match(await page.locator('body').innerText(), /オフライン|오프라인에서 표시하지 않습니다/)
  assert.doesNotMatch(await page.locator('body').innerText(), /최근에 본 책 페이지는|내 위시리스트 보기/)
  const privateResponse = await page.goto(`${base}/me/wishlist`, { timeout: 60000 })
  assert.equal(new URL(page.url()).pathname, '/login')
  const privateCacheControl = privateResponse.headers()['cache-control'] || ''
  // Dynamic protected routes must not be retained by the HTTP cache either.
  const cachePaths = await page.evaluate(async () => {
    const results = []
    for (const name of await caches.keys()) {
      const cache = await caches.open(name)
      results.push({ name, paths: (await cache.keys()).map((r) => new URL(r.url).pathname) })
    }
    return results
  })
  for (const cache of cachePaths) {
    assert.match(cache.name, /^nearbook-public-/)
    for (const path of cache.paths) assert.match(path, /^\/offline\.html$|^\/icons\/icon-(192|512)\.png$|^\/_next\/static\//)
  }
  await context.setOffline(true)
  await page.goto(`${base}/me/wishlist`, { timeout: 30000 })
  const offlineBody = await page.locator('body').innerText()
  assert.match(offlineBody, /인터넷 연결이 끊겼어요/)
  assert.match(offlineBody, /개인정보와 도서 보유·대출 상태/)
  assert.doesNotMatch(offlineBody, /최근에 본 책 페이지는|내 위시리스트 보기|로그아웃/)
  const width = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }))
  assert.equal(width.viewport, 390); assert.ok(width.document <= 390)
  if (evidence) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: `${evidence}/p1-02-${process.env.PWA_STAGE || 'remote'}-offline.png` }) }
  await context.setOffline(false)
  await page.goto(`${base}/offline`, { timeout: 60000 })
  assert.match(await page.locator('body').innerText(), /오프라인에서 표시하지 않습니다/)
  console.log(JSON.stringify({ base, privateRedirect: '/login', privateCacheControl, cachePaths, offline: true, restored: true, width, passed: true }, null, 2))
} finally { await browser.close() }
