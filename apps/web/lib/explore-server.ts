import { SERVER_API_BASE_URL } from './server-api'
import { loadExploreItems } from './explore-data.mjs'
import type { ExploreBook } from '@/app/explore/_components/explore-ui'

export type Timing = { curationPeriod?: string | null; fetchedAt?: string | null }
export type ExploreResult<T> = { status: 'ready' | 'empty' | 'error'; items: T[] }
export type CurationBook = ExploreBook & Timing
export type CurationCategory = Timing & { code: string; name: string | null; count: number }
export type CurationLibrary = Timing & { id: number; name: string; address: string | null; region: string | null; bookCount: number | null }

export async function exploreBooks(path: string): Promise<ExploreResult<CurationBook>> {
  return await loadExploreItems(`${SERVER_API_BASE_URL}${path}`, 'books') as ExploreResult<CurationBook>
}
export async function exploreCategories(): Promise<ExploreResult<CurationCategory>> {
  return await loadExploreItems(`${SERVER_API_BASE_URL}/books/categories?limit=40`, 'categories') as ExploreResult<CurationCategory>
}
export async function exploreLibraries(): Promise<ExploreResult<CurationLibrary>> {
  return await loadExploreItems(`${SERVER_API_BASE_URL}/libraries/featured-new-arrivals?limit=12`, 'libraries') as ExploreResult<CurationLibrary>
}
