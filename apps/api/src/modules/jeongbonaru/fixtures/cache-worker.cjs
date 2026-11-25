// Only launched by the isolated integration suite, with ts-node and a fixture DB.
const target = new URL(process.env.DATABASE_URL || 'http://missing')
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.pathname !== '/nearbook_quota_test')
  throw new Error('Fixture DB only')
const { ProviderCacheService } = require('../provider-cache.service.ts')
const { QuotaService } = require('../../quota/quota.service.ts')
const { ConfigService } = require('@nestjs/config')
const { db, sql } = require('@nearbook/db')
const quota = new QuotaService(new ConfigService({ JEONGBONARU_REFRESH_DAILY_LIMIT: '5' }))
new ProviderCacheService().get('/usageTrend', { libCode: 'cross-process' }, async () => {
  const reservation = await quota.acquire('jeongbonaru', 'LOW', '/usageTrend', 'refresh')
  await quota.complete(reservation, 200, 100)
  await new Promise((done) => setTimeout(done, 100))
  return { response: { results: [] } }
}, 60).then((result) => {
  process.stdout.write(JSON.stringify({ stale: result.cacheInfo.stale }))
  process.exit(0)
}).catch(() => { process.stderr.write('Fixture worker failed'); process.exit(1) })
