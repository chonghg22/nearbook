// Optional integration check in an isolated Chromium profile, never a real
// user account. Supply a local Playwright module via PWA_PLAYWRIGHT_MODULE.
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'

const { chromium } = await import(pathToFileURL(process.env.PWA_PLAYWRIGHT_MODULE))
const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
const legacy = execFileSync('git', ['show', '02a5c67:apps/web/public/sw.js'], { encoding: 'utf8' })
const offline = await readFile(new URL('../public/offline.html', import.meta.url))
const privacy = await readFile(new URL('../lib/pwa-privacy.mjs', import.meta.url))
const icon = await readFile(new URL('../public/icons/icon-192.png', import.meta.url))
let upgraded = false
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  const identity = /fixture-user=B/.test(req.headers.cookie || '') ? 'B' : 'A'
  if (path === '/sw.js') { res.setHeader('Content-Type', 'text/javascript'); res.setHeader('Cache-Control', 'no-store'); return res.end(upgraded ? sw : legacy) }
  if (path === '/privacy.mjs') { res.setHeader('Content-Type', 'text/javascript'); return res.end(privacy) }
  if (path === '/offline.html') { res.setHeader('Content-Type', 'text/html'); return res.end(offline) }
  if (path.startsWith('/icons/')) { res.setHeader('Content-Type', 'image/png'); return res.end(icon) }
  if (path.startsWith('/_next/static/')) { res.setHeader('Content-Type', 'text/javascript'); return res.end('window.fixtureAsset = true') }
  if (path.startsWith('/api/')) { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ fixture: `PRIVATE_${identity}` })) }
  res.setHeader('Content-Type', 'text/html'); res.setHeader('Cache-Control', 'no-store')
  res.end(`<!doctype html><html lang="ko"><body><h1>PRIVATE_${identity}</h1><button id="switch">Switch fixture account</button><script type="module">
    import { accountBoundary, clearPwaCaches } from '/privacy.mjs';
    window.fixtureBoundary = accountBoundary({clear: () => clearPwaCaches(caches, true), hide: () => { document.body.style.visibility='hidden' }, reload: () => location.replace('/')});
    window.fixtureBoundary('${identity}');
    document.querySelector('#switch').onclick = () => { document.cookie='fixture-user=B;path=/'; window.fixtureBoundary('B') };
    navigator.serviceWorker.register('/sw.js', {updateViaCache:'none'});
  </script></body></html>`)
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await context.newPage()
const checks = []
try {
  await page.goto(base)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await page.goto(`${base}/me/wishlist`)
  await page.evaluate(() => fetch('/api/me').then((r) => r.json()))
  await page.waitForFunction(async () => (await caches.open('api-v1-2026-05-12')).match('/api/me'))
  assert.match(await page.locator('body').innerText(), /PRIVATE_A/)
  checks.push('legacy worker really stored private fixture data')

  upgraded = true
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update() })
  await page.waitForFunction(async () => {
    const keys = await caches.keys()
    return keys.includes('nearbook-public-v2-2026-10-14') && !keys.some((k) => /^(static|api|images)-/.test(k))
  })
  await page.waitForFunction(() => typeof window.fixtureBoundary === 'function')
  checks.push('real worker upgrade removed legacy caches and reloaded existing page')

  await page.evaluate(() => fetch('/api/me').then((r) => r.json()))
  await page.evaluate(() => fetch('/_next/static/build/test.js').then((r) => r.text()))
  await page.waitForFunction(async () => (await caches.open('nearbook-public-v2-2026-10-14')).match('/_next/static/build/test.js'))
  const urls = await page.evaluate(async () => (await (await caches.open('nearbook-public-v2-2026-10-14')).keys()).map((r) => new URL(r.url).pathname))
  assert.equal(urls.some((p) => p.startsWith('/api/') || p.startsWith('/me/')), false)
  checks.push('public build asset cached; real private API and navigation not cached')

  await page.click('#switch')
  await page.waitForFunction(() => document.body.innerText.includes('PRIVATE_B'))
  assert.doesNotMatch(await page.locator('body').innerText(), /PRIVATE_A/)
  checks.push('A→B hides previous document and full navigation displays B only')

  // Existing worker remains controlled after account cleanup; storage may now
  // have no offline entry. The synthetic, no-store fallback must still work.
  await context.setOffline(true)
  await page.goto(`${base}/me/wishlist`)
  const body = await page.locator('body').innerText()
  assert.match(body, /인터넷 연결이 끊겼어요/)
  assert.match(body, /개인정보/)
  assert.doesNotMatch(body, /PRIVATE_A|PRIVATE_B/)
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }))
  assert.equal(dimensions.viewport, 390); assert.ok(dimensions.width <= 390)
  checks.push('offline private navigation shows no A/B data; 390px no overflow')
  if (process.env.PWA_EVIDENCE_DIR) {
    await mkdir(process.env.PWA_EVIDENCE_DIR, { recursive: true })
    await page.screenshot({ path: `${process.env.PWA_EVIDENCE_DIR}/p1-02-browser-offline.png` })
  }
  await context.setOffline(false)
  await page.goto(`${base}/me/wishlist`)
  assert.match(await page.locator('body').innerText(), /PRIVATE_B/)
  checks.push('network restoration recovers live B, not stored A')
  console.log(JSON.stringify({ browser: 'isolated Chromium', checks, passed: true }, null, 2))
} finally {
  await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
