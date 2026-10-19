const { test } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const { spawn } = require('node:child_process')
const path = require('node:path')
const revision = 'a'.repeat(40)

async function probe(handler, rev = revision, scheduler = 'true') {
  const server = http.createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    return await new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(__dirname, 'check-readiness.cjs'), rev, scheduler,
        `http://127.0.0.1:${server.address().port}`], { stdio: 'ignore' })
      child.on('exit', resolve)
    })
  } finally { await new Promise((resolve) => server.close(resolve)) }
}
const ready = { status: 'ready', checks: { database: true, search: true }, revision, schedulerEnabled: true }
test('probe validates dependency status, source revision and scheduler mode', async () => {
  for (const [patch, expected] of [
    [{}, 0], [{ revision: 'b'.repeat(40) }, 1], [{ schedulerEnabled: false }, 1],
    [{ checks: { database: false, search: true } }, 1], [{ status: 'not_ready' }, 1],
  ]) {
    assert.equal(await probe((req, res) => res.end(JSON.stringify({ ...ready, ...patch }))), expected)
  }
})
test('probe rejects HTTP failures and invalid JSON', async () => {
  assert.equal(await probe((req, res) => { res.statusCode = 503; res.end(JSON.stringify(ready)) }), 1)
  assert.equal(await probe((req, res) => res.end('<html>upstream error</html>')), 1)
})
test('legacy requires both process health and the complete old index', async () => {
  for (const ready of [true, false]) {
    assert.equal(await probe((req, res) => res.end(JSON.stringify(
      req.url === '/health' ? { status: 'ok' } : { index: { ready } }
    )), 'legacy'), ready ? 0 : 1)
  }
})
