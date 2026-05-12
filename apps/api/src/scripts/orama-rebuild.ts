import { existsSync } from 'fs'
import { resolve } from 'path'
import { config as loadEnv } from 'dotenv'

for (const envFile of ['.env.local', '.env']) {
  const envPath = resolve(process.cwd(), envFile)
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: false })
  }
}

import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { OramaIndexService } from '../modules/search/orama-index.service'

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'warn', 'error'] })

  try {
    const orama = app.get(OramaIndexService)
    console.log('Starting Orama full rebuild...')
    await orama.fullRebuild()
    console.log('Rebuild complete.')
  } finally {
    await app.close()
  }
}

main().catch((error) => {
  console.error('Rebuild failed:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
