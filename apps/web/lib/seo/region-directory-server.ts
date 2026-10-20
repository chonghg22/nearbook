import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { requestApiJson } from '@/lib/api-request.mjs'
import { SERVER_API_BASE_URL } from '@/lib/server-api'
import { buildRegionDirectory, collectRegionLibraries } from './region-directory'

// Only successful full scans are cached. Transient failures throw out of the cache.
const readDirectory = unstable_cache(
  async () => {
    const started = Date.now()
    const libraries = await collectRegionLibraries(async (page) => {
      if (page > 1) await new Promise((resolve) => setTimeout(resolve, 150))
      const remaining = 15000 - (Date.now() - started)
      if (remaining <= 0) throw new Error('Directory deadline exceeded')
      return requestApiJson(`${SERVER_API_BASE_URL}/libraries?limit=100&page=${page}`, {
        timeoutMs: Math.min(4000, remaining),
      })
    })
    return buildRegionDirectory(libraries)
  },
  ['regional-library-directory-v1', SERVER_API_BASE_URL],
  { revalidate: 21600 }
)

export const getRegionDirectory = cache(async () => {
  try {
    return await readDirectory()
  } catch {
    return null
  }
})
