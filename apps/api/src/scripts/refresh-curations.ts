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
import { HomeCurationsService } from '../modules/home-curations/services/home-curations.service'

type RefreshScope = 'home' | 'monthly' | 'categories' | 'libraries' | 'all'

function getArgValue(flag: string) {
  const index = process.argv.findIndex((arg) => arg === flag || arg.startsWith(`${flag}=`))
  if (index === -1) return undefined

  const current = process.argv[index]
  if (current.includes('=')) return current.split('=').slice(1).join('=')
  return process.argv[index + 1]
}

function parseScopes(): RefreshScope[] {
  const raw = getArgValue('--scope') ?? 'all'
  const scopes = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean) as RefreshScope[]

  return scopes.length > 0 ? scopes : ['all']
}

function parseNumberArg(flag: string, fallback: number) {
  const raw = getArgValue(flag)
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'warn', 'error'] })

  try {
    const homeCurations = app.get(HomeCurationsService)
    const scopes = parseScopes()
    const categoryLimit = parseNumberArg('--category-limit', 40)
    const libraryLimit = parseNumberArg('--library-limit', 12)
    const bookLimit = parseNumberArg('--book-limit', 40)
    const results: Record<string, unknown> = {}

    const runAll = scopes.includes('all')

    if (runAll || scopes.includes('home')) {
      results.home = await homeCurations.refreshDailyBookCurations(20)
    }

    if (runAll || scopes.includes('monthly')) {
      results.monthly = await homeCurations.refreshMonthlyKeywords(10)
    }

    if (runAll || scopes.includes('categories')) {
      results.categories = await homeCurations.refreshCategoryCurations(categoryLimit)
    }

    if (runAll || scopes.includes('libraries')) {
      results.libraries = await homeCurations.refreshFeaturedLibraryNewArrivals(bookLimit, libraryLimit)
    }

    console.log(JSON.stringify({
      ok: true,
      scopes,
      categoryLimit,
      libraryLimit,
      bookLimit,
      results,
    }, null, 2))
  } finally {
    await app.close()
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2))
  process.exit(1)
})
