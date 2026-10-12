import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  DEFAULT_API_BASE_URL,
  isProductionApiEnvironment,
  resolvePublicApiBaseUrl,
  resolveServerApiBaseUrl,
} from '../lib/api-base-url.mjs'

for (const value of [undefined, '', '   ']) {
  test(`empty configuration ${JSON.stringify(value)} uses absolute default`, () => {
    assert.equal(resolvePublicApiBaseUrl(value), DEFAULT_API_BASE_URL)
    assert.equal(resolveServerApiBaseUrl({ internalUrl: value, publicUrl: value }), DEFAULT_API_BASE_URL)
  })
}

test('browser /api does not propagate to server', () => {
  assert.equal(resolvePublicApiBaseUrl(' /api/ '), '/api')
  assert.equal(resolveServerApiBaseUrl({ publicUrl: '/api' }), DEFAULT_API_BASE_URL)
})
test('absolute public URL is the fallback for SSR and rewrite', () => {
  assert.equal(resolveServerApiBaseUrl({ publicUrl: ' https://upstream.example/v1/// ' }), 'https://upstream.example/v1')
})
test('explicit upstream wins over browser URL', () => {
  assert.equal(resolveServerApiBaseUrl({ internalUrl: 'https://internal.example/', publicUrl: '/api' }), 'https://internal.example')
})
test('empty internal URL falls back safely', () => {
  assert.equal(resolveServerApiBaseUrl({ internalUrl: ' ', publicUrl: '/api' }), DEFAULT_API_BASE_URL)
})
test('local HTTP development remains supported', () => {
  assert.equal(resolveServerApiBaseUrl({ internalUrl: 'http://localhost:3001' }), 'http://localhost:3001')
})
for (const value of ['/', '/api', '/relative', '//upstream.example', 'https:upstream.example', 'ftp://upstream.example', 'not-a-url',
  'https://user:secret@upstream.example', 'https://upstream.example?token=secret', 'https://upstream.example#secret',
  'https://near-book.com/api', 'https://www.near-book.com/api']) {
  test(`reject invalid internal URL ${value.replace(/secret/g, '[redacted]')}`, () => {
    assert.throws(() => resolveServerApiBaseUrl({ internalUrl: value }), /INTERNAL_API_URL/)
  })
}
for (const value of ['/relative', '//upstream.example', 'not-a-url', 'https://near-book.com/api']) {
  test(`reject invalid public URL ${value}`, () => {
    assert.throws(() => resolvePublicApiBaseUrl(value), /NEXT_PUBLIC_API_BASE_URL/)
  })
}
for (const value of ['http://upstream.example', 'http://localhost:3001', 'https://localhost', 'https://127.0.0.1', 'https://127.0.0.2', 'https://[::1]']) {
  test(`reject production HTTP or loopback ${value}`, () => {
    assert.throws(() => resolvePublicApiBaseUrl(value, true), /production/)
    assert.throws(() => resolveServerApiBaseUrl({ internalUrl: value, production: true }), /production/)
  })
}
test('production allows HTTPS and same-origin browser proxy', () => {
  assert.equal(resolvePublicApiBaseUrl('/api', true), '/api')
  assert.equal(resolveServerApiBaseUrl({ publicUrl: '/api', production: true }), DEFAULT_API_BASE_URL)
})
test('production flag uses deployment environment, not local NODE_ENV', () => {
  assert.equal(isProductionApiEnvironment({ vercelEnv: 'production' }), true)
  assert.equal(isProductionApiEnvironment({ appEnv: 'production' }), true)
  assert.equal(isProductionApiEnvironment({ vercelEnv: 'preview' }), false)
  assert.equal(isProductionApiEnvironment(), false)
})
test('validation errors never echo URL secrets', () => {
  assert.throws(() => resolveServerApiBaseUrl({ internalUrl: 'https://user:secret@upstream.example' }), (error) => !error.message.includes('secret'))
})

const root = fileURLToPath(new URL('../', import.meta.url))
const read = (file) => readFileSync(path.join(root, file), 'utf8')
function sources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)
    if (entry.name.startsWith('.') || entry.name === 'node_modules') return []
    return entry.isDirectory() ? sources(file) : /\.(ts|tsx|mjs)$/.test(file) && !/\.test\./.test(file) ? [file] : []
  })
}
test('server consumers no longer use browser constants or ad-hoc environment rules', () => {
  for (const file of sources(path.join(root, 'app/api'))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /PUBLIC_API_BASE_URL|process\.env\.(INTERNAL_API_URL|NEXT_PUBLIC_API_BASE_URL)/, file)
  }
  for (const file of sources(root)) {
    if (file.includes(`${path.sep}scripts${path.sep}`)) continue
    const source = readFileSync(file, 'utf8')
    if (/^['"]use client['"]/m.test(source)) assert.doesNotMatch(source, /(?:lib\/server-api|INTERNAL_API_URL|SERVER_API_BASE_URL)/, file)
  }
  assert.doesNotMatch(read('lib/constants.ts'), /INTERNAL_API_URL|SERVER_API_BASE_URL/)
})
test('Next validates public configuration and rewrite shares server resolver', () => {
  const config = read('next.config.ts')
  assert.match(config, /resolvePublicApiBaseUrl\(process\.env\.NEXT_PUBLIC_API_BASE_URL, production\)/)
  assert.match(config, /resolveServerApiBaseUrl\(/)
  assert.match(config, /destination: `\$\{serverApiBaseUrl\}\/:path\*`/)
})
