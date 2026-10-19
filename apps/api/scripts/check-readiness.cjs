// Read-only local probes. Also usable as: docker exec -i CONTAINER node - REV MODE < this-file
const http = require('node:http')
const https = require('node:https')
const [revision, scheduler, origin = 'http://127.0.0.1:3001'] = process.argv.slice(2)
function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, origin)
    const transport = url.protocol === 'https:' ? https : http
    const req = transport.get(url, { timeout: 2500, headers: { 'Cache-Control': 'no-cache' } }, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk; if (body.length > 65536) req.destroy(new Error('oversize')) })
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) throw new Error('http')
          resolve(JSON.parse(body))
        } catch { reject(new Error('invalid probe')) }
      })
      res.on('error', reject)
    })
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
  })
}
async function main() {
  if (revision === 'legacy') {
    // First adoption: old image has no /ready. Verify retained process/index;
    // this does not claim the new DB readiness contract for a legacy image.
    const health = await get('/health')
    const search = await get('/operations/search')
    if (health.status !== 'ok' || search.index?.ready !== true) throw new Error('legacy not ready')
  } else {
    if (!/^[a-f0-9]{40}$/.test(revision) || !['true', 'false'].includes(scheduler)) throw new Error('arguments')
    const ready = await get('/ready')
    if (ready.status !== 'ready' || ready.checks?.database !== true || ready.checks?.search !== true ||
        ready.revision !== revision || ready.schedulerEnabled !== (scheduler === 'true')) throw new Error('not ready')
  }
}
main().catch(() => { process.stderr.write('Readiness probe failed\n'); process.exitCode = 1 })
